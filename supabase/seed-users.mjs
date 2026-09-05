// Cria 5 usuários operador + 1 admin no Supabase Auth via Management API.
// Cada um com profile e user_role (role=operator|coordinator) associados.
// Uso: node supabase/seed-users.mjs
const PROJECT_REF = 'uoujzvpecohinketylud';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
  console.error('Defina SUPABASE_ACCESS_TOKEN no ambiente.');
  process.exit(1);
}

const USERS = [
  { email: 'op1@fast.local',  password: 'FastOpex!2026', full_name: 'Carlos Silva',     role: 'operator',     phone: '+55 11 99001-0001' },
  { email: 'op2@fast.local',  password: 'FastOpex!2026', full_name: 'Mariana Souza',    role: 'operator',     phone: '+55 11 99001-0002' },
  { email: 'op3@fast.local',  password: 'FastOpex!2026', full_name: 'Rafael Lima',      role: 'operator',     phone: '+55 11 99001-0003' },
  { email: 'op4@fast.local',  password: 'FastOpex!2026', full_name: 'Juliana Pereira',  role: 'operator',     phone: '+55 11 99001-0004' },
  { email: 'op5@fast.local',  password: 'FastOpex!2026', full_name: 'Pedro Almeida',    role: 'operator',     phone: '+55 11 99001-0005' },
  { email: 'coord@fast.local',password: 'FastCoord!2026',full_name: 'TI Admin',         role: 'coordinator',  phone: '+55 11 99000-0001' },
];

async function createUser(u) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/auth/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, role: u.role, phone: u.phone },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    return { email: u.email, status: res.status, error: text };
  }
  try { return { email: u.email, status: 201, data: JSON.parse(text) }; }
  catch { return { email: u.email, status: 201, data: text }; }
}

const results = await Promise.all(USERS.map(createUser));
for (const r of results) {
  if (r.status === 201) {
    const id = r.data?.id ?? r.data?.user?.id ?? '?';
    console.log(`OK  ${r.email.padEnd(20)} id=${id}`);
  } else if (r.status === 422 && r.error?.includes('already')) {
    console.log(`SKIP ${r.email.padEnd(20)} already exists`);
  } else {
    console.log(`ERR ${r.email.padEnd(20)} ${r.status} ${r.error?.slice(0, 200)}`);
  }
}