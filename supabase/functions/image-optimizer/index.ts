// STUB — esta função foi identificada como não implementada durante auditoria
// (retornava os bytes originais sem otimizar). Enquanto uma implementação real
// não estiver disponível (ex.: via `imagescript` ou `sharp` server-side), a
// função responde 501 para que o cliente saiba que o serviço está indisponível
// em vez de assumir que a otimização ocorreu.

import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve((req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  return new Response(
    JSON.stringify({
      error: "image-optimizer is not implemented",
      status: "not_implemented",
      hint: "Use client-side optimization (browser-image-compression) or wire up a real server-side image pipeline before calling this endpoint.",
    }),
    {
      status: 501,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    },
  );
});
