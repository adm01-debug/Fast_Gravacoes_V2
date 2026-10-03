# LGPD — inventário de dados pessoais e procedimentos

Sistema MES interno da FAST GRAVAÇÕES. Controladora: a própria empresa.
Dados pessoais são quase todos de **funcionários** (operadores/coordenadores)
— base legal predominante: execução de contrato de trabalho + legítimo
interesse (segurança e auditoria).

## Inventário

| Onde | Dado pessoal | Finalidade | Retenção |
|---|---|---|---|
| `profiles` | nome, cargo/role, avatar, telefone (`profiles.phone`, coletado no cadastro de operador) | identificação e contato operacional | vínculo empregatício + arquivamento |
| `auth.users` | e-mail, hash de senha, fatores MFA | autenticação | vínculo + segurança |
| `login_audit` / `security_events` | IP, user-agent, horários, **e-mail** (`user_email`) | segurança, detecção de acesso indevido | 30 dias (cleanup-security-logs — quando agendado, ver RETENCAO-DE-LOGS.md) |
| `blocked_ips` | IP bloqueado | proteção anti-brute-force | até expirar/unblock |
| `audit_log` | quem fez o quê e quando | trilha de auditoria | 12 meses sugerido (ver RETENCAO-DE-LOGS.md) |
| `production_lots`, `jobs`, `tpm_*` | operador responsável (id/nome) | rastreabilidade de produção | permanente (dado de negócio) |
| `push_subscriptions` / tokens | endpoint de push do dispositivo + chaves | notificações operacionais | até **desinscrição explícita** do dispositivo (logout comum NÃO remove a subscription — revogar também no painel em desligamento) |
| `production_photos` (jobs) | fotos de produção — pode conter pessoas | evidência de qualidade | seguir `jobs` |

Não há coleta de dados de clientes finais nem marketing. Processadores de
infraestrutura que recebem dados pessoais: Vercel (frontend), Supabase
(banco/auth — projeto `uoujzvpecohinketylud`), **Resend** (quando o envio de
e-mail está configurado: recebe destinatário, assunto e corpo dos relatórios)
e **Sentry** (telemetria/erros, quando `VITE_SENTRY_DSN` está configurado).

## Direitos do titular — como atender

- **Acesso/confirmação**: exportar por usuário via query direta — `profiles`
  + `audit_log` filtrado por `actor_id`/`user_id`. ATENÇÃO: o export JSON de
  Settings → Backup NÃO serve para titular — ele exporta a base inteira
  (`jobs`, `profiles`, `machines` sem filtro de usuário). Enquanto não existe
  export escopado na UI, usar SQL/admin:
  `SELECT * FROM profiles WHERE id = '<user_id>';`
  `SELECT * FROM audit_log WHERE actor_id = '<user_id>';`
- **Correção**: edição normal em Configurações → Usuários.
- **Eliminação**: funcionário desligado → revogar acesso de verdade:
  1) `user_roles` do usuário → `DELETE` (remove permissões);
  2) Supabase Auth admin → ban/suspend do usuário (`auth.users.banned_until`
     ou delete) — `update-operator` NÃO revoga acesso, só edita nome/telefone;
  3) revogar sessões ativas (admin signOut por usuário);
  4) anonimizar `profiles` (nome → "Usuário removido <id curto>").
  NÃO apagar `jobs`/`production_lots` — rastreabilidade de produto é
  obrigação legal e sobreleva a eliminação (art. 16, LGPD).
- **Portabilidade**: usar o export escopado por usuário (queries acima) — o JSON de Settings é backup operacional, não portabilidade.

## Incidente de segurança

Em suspeita de vazamento: 1) `security_events` + `login_audit` para
escopo; 2) revogar sessões (`auth.admin.signOut` global ou por usuário);
3) rotacionar `SERVICE_ROLE_KEY` e segredos afetados; 4) avaliar
comunicação à ANPD (art. 48) se houver risco aos titulares.

## Contato / encarregado

Responsável interno pela privacidade: **[PREENCHER — nome + e-mail]**.
Atualizar também a política de privacidade exibida aos usuários, se houver.
