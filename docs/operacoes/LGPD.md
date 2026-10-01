# LGPD — inventário de dados pessoais e procedimentos

Sistema MES interno da FAST GRAVAÇÕES. Controladora: a própria empresa.
Dados pessoais são quase todos de **funcionários** (operadores/coordenadores)
— base legal predominante: execução de contrato de trabalho + legítimo
interesse (segurança e auditoria).

## Inventário

| Onde | Dado pessoal | Finalidade | Retenção |
|---|---|---|---|
| `profiles` | nome, cargo/role, avatar | identificação no sistema | vínculo empregatício + arquivamento |
| `auth.users` | e-mail, hash de senha, fatores MFA | autenticação | vínculo + segurança |
| `login_audit` / `security_events` | IP, user-agent, horários | segurança, detecção de acesso indevido | 30 dias (cleanup-security-logs) |
| `blocked_ips` | IP bloqueado | proteção anti-brute-force | até expirar/unblock |
| `audit_log` | quem fez o quê e quando | trilha de auditoria | 12 meses sugerido (ver RETENCAO-DE-LOGS.md) |
| `production_lots`, `jobs`, `tpm_*` | operador responsável (id/nome) | rastreabilidade de produção | permanente (dado de negócio) |
| `push_subscriptions` / tokens | endpoint de push do dispositivo | notificações operacionais | até logout/desinscrição |
| `production_photos` (jobs) | fotos de produção — pode conter pessoas | evidência de qualidade | seguir `jobs` |

Não há coleta de dados de clientes finais, marketing, nem compartilhamento
com terceiros além dos processadores de infraestrutura (Vercel = frontend,
servidor próprio do Supabase = dados).

## Direitos do titular — como atender

- **Acesso/confirmacão**: exportar por usuário — `profiles` + `audit_log`
  filtrado por `user_id` (Settings → Exportar gera JSON, ou query direta).
- **Correção**: edição normal em Configurações → Usuários.
- **Eliminação**: funcionário desligado → remover acesso (`update-operator`
  desativa) e anonimizar `profiles` (nome → "Usuário removido <id curto>").
  NÃO apagar `jobs`/`production_lots` — rastreabilidade de produto é
  obrigação legal e sobreleva a eliminação (art. 16, LGPD).
- **Portabilidade**: o export JSON de Settings cobre os dados-chave.

## Incidente de segurança

Em suspeita de vazamento: 1) `security_events` + `login_audit` para
escopo; 2) revogar sessões (`auth.admin.signOut` global ou por usuário);
3) rotacionar `SERVICE_ROLE_KEY` e segredos afetados; 4) avaliar
comunicação à ANPD (art. 48) se houver risco aos titulares.

## Contato / encarregado

Responsável interno pela privacidade: **[PREENCHER — nome + e-mail]**.
Atualizar também a política de privacidade exibida aos usuários, se houver.
