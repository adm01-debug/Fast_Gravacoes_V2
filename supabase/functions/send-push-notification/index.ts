import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

interface PushNotificationRequest {
  user_id?: string;
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
  broadcast?: boolean;
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

type PushResult = "sent" | "expired" | "failed";

/**
 * Validates that a push endpoint URL is a legitimate HTTPS URL pointing to an
 * external push service — not a private IP, loopback, or link-local address.
 * Without this check, a malicious user could insert a fake subscription row
 * pointing to an internal service and cause the edge function to SSRF it.
 */
function isValidPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;

  const h = url.hostname;

  if (h === "localhost" || h === "::1") return false;
  if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return false;

  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a >= 224) return false; // multicast / reserved
  }

  return true;
}

// Web Push implementation using fetch API.
// Returns "expired" ONLY for 404/410 (the push service says the subscription is
// gone). Any other failure (transient 5xx/429, VAPID/key errors, network) is
// "failed" and must NOT cause the subscription to be deleted.
async function sendWebPush(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<PushResult> {
  try {
    // Create JWT for VAPID
    const header = { alg: "ES256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const audience = new URL(subscription.endpoint).origin;
    
    const claims = {
      aud: audience,
      exp: now + 12 * 60 * 60, // 12 hours
      sub: vapidSubject,
    };

    // Base64url encode
    const base64UrlEncode = (data: string | Uint8Array): string => {
      const base64 = typeof data === "string" 
        ? btoa(data) 
        : btoa(String.fromCharCode(...data));
      return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(claims));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    // Import private key and sign
    const privateKeyBuffer = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBuffer,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );

    const token = `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;

    // Guard against SSRF: reject non-HTTPS endpoints and private/loopback addresses.
    if (!isValidPushEndpoint(subscription.endpoint)) {
      console.error(`[send-push-notification] Rejected invalid endpoint: ${subscription.endpoint.substring(0, 60)}`);
      return "failed";
    }

    // Send push notification
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
        "Authorization": `vapid t=${token}, k=${vapidPublicKey}`,
      },
      body: new TextEncoder().encode(payload),
    });

    if (response.status === 201 || response.status === 200) {
      console.log(`Push sent successfully to ${subscription.endpoint.substring(0, 50)}...`);
      return "sent";
    } else if (response.status === 410 || response.status === 404) {
      console.log(`Subscription expired: ${subscription.endpoint.substring(0, 50)}...`);
      return "expired";
    } else {
      const errorBody = (await response.text()).substring(0, 200);
      console.error(`Push failed with status ${response.status}: ${errorBody}`);
      return "failed";
    }
  } catch (error) {
    console.error("Web Push error:", error);
    return "failed";
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Accept service-role key (internal Edge Function calls) or valid user JWT
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    const providedKey = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!providedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    let callerUserId: string | null = null;
    const isServiceRole = providedKey === supabaseServiceKey;
    if (!isServiceRole) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey);
      const { data: { user }, error: authError } = await userClient.auth.getUser(providedKey);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      callerUserId = user.id;
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@fastgrava.com";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }
    const { user_id, title, body, icon, data, broadcast }: PushNotificationRequest = rawBody;

    // Only coordinators/admins can broadcast; operators can only notify themselves
    if (!isServiceRole && (broadcast || (user_id && user_id !== callerUserId))) {
      const { data: roleRows, error: roleCheckError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", callerUserId!)
        .eq("is_active", true);
      if (roleCheckError) {
        return new Response(
          JSON.stringify({ error: "Falha ao verificar permissão" }),
          { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      if (!(roleRows ?? []).some((r: { role: string }) => ["coordinator", "admin"].includes(r.role))) {
        return new Response(
          JSON.stringify({ error: "Sem permissão para enviar notificações a outros usuários" }),
          { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
    }

    // Broadcast requires service-role key or admin/manager role.
    // Filter by eligible roles before limit(1) to handle users with multiple role rows.
    if (broadcast && !isServiceRole && callerUserId) {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", callerUserId)
        .in("role", ["admin", "manager"])
        .limit(1);
      if (!roleRows || roleRows.length === 0) {
        return new Response(JSON.stringify({ error: "Forbidden: broadcast requires admin or manager role" }), {
          status: 403,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
    }

    // Non-broadcast requests must always provide a user_id
    if (!broadcast) {
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id is required for non-broadcast push" }), {
          status: 400,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (!isServiceRole && user_id !== callerUserId) {
        return new Response(JSON.stringify({ error: "Forbidden: cannot send to another user's subscriptions" }), {
          status: 403,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
    }

    console.log("Sending push notification:", { user_id, title, broadcast });

    // Fetch subscriptions
    let subscriptionsQuery = supabase.from("push_subscriptions").select("*");

    if (!broadcast && user_id) {
      subscriptionsQuery = subscriptionsQuery.eq("user_id", user_id);
    }

    const { data: subscriptions, error: subError } = await subscriptionsQuery;

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscriptions found");
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions found", sent: 0 }),
        { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    // Create notification record
    const { data: notification, error: notifError } = await supabase
      .from("push_notifications")
      .insert({
        user_id: broadcast ? null : user_id,
        title,
        body,
        icon,
        data,
        status: "sending",
      })
      .select()
      .single();

    if (notifError) {
      console.error("Error creating notification record:", notifError);
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || "/pwa-icons/icon-192x192.png",
      data,
      timestamp: Date.now(),
    });

    // Send to each subscription
    let successCount = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions as PushSubscription[]) {
      try {
        if (vapidPublicKey && vapidPrivateKey) {
          const result = await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey, vapidSubject);
          if (result === "sent") {
            successCount++;
          } else if (result === "expired") {
            // Only 404/410 means the subscription is truly gone — safe to delete.
            expiredEndpoints.push(sub.endpoint);
          }
          // result === "failed": transient/config error — keep the subscription.
        } else {
          // Fallback: log that push would be sent (VAPID not configured)
          console.log(`[VAPID not configured] Would send to: ${sub.endpoint.substring(0, 50)}...`);
          successCount++;
        }
      } catch (error) {
        console.error(`Error sending to ${sub.endpoint}:`, error);
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);

      if (deleteError) {
        console.error("Error deleting expired subscriptions:", deleteError);
      } else {
        console.log(`Deleted ${expiredEndpoints.length} expired subscriptions`);
      }
    }

    // Update notification status
    if (notification) {
      await supabase
        .from("push_notifications")
        .update({
          status: successCount > 0 ? "sent" : "failed",
          sent_at: new Date().toISOString(),
        })
        .eq("id", notification.id);
    }

    console.log(`Push notification sent to ${successCount}/${subscriptions.length} subscribers`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
        notification_id: notification?.id,
        vapid_configured: !!(vapidPublicKey && vapidPrivateKey),
      }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
