# FAST Gravações - Sistema de Gestão Industrial

Sistema de alta performance para gestão de produção, OEE, Kanban e automação industrial.

## 📖 Documentação Técnica

Para entender a arquitetura do sistema, fluxos de dados e contratos de API, consulte:

👉 **[Guia de Arquitetura (ARCHITECTURE.md)](docs/ARCHITECTURE.md)**

### O que você encontrará na documentação:
- **Diagrama de Sequência:** Como os dados fluem da UI para o banco.
- **Mapa de Pastas:** Responsabilidades de cada camada (Frontend, Edge Functions, etc).
- **Contratos de API:** Documentação da `external-db-bridge`.
- **Padrões de Código:** Regras obrigatórias para novos desenvolvedores.

## 🚀 Desenvolvimento

### Requisitos
- Bun ou Node.js
- Supabase CLI

### Validação de Contratos
Para validar se a Edge Function `external-db-bridge` está operando conforme documentado:
```bash
deno run --allow-net --allow-env supabase/functions/external-db-bridge/validate_contract.ts
```

## Grafo de arquitetura (Graphify)

O Graphify mapeia código frontend, Edge Functions, migrations e testes por extração
local. O grafo ajuda a localizar dependências e avaliar impacto; não comprova
permissões, comportamento em produção ou conclusão dos checkpoints da auditoria.

```bash
npm run graph:install
npm run graph:build
npm run graph:query -- "authenticate requireRole requireAal2" --budget 1500
npm run graph:html
```

Abra `graphify-out/graph.html`. Há perfis `all`, `security`, `frontend` e `backend`:
use o mesmo `--profile` na geração e na consulta. Veja o
[guia operacional](docs/graphify/README.md) e o
[plano detalhado de 50 etapas](docs/plano-graphify-50-etapas.md).

## 🛠️ Tecnologias utilizadas

- **Frontend:** React, Vite, Tailwind CSS, Shadcn UI.
- **Backend:** Supabase, Edge Functions (Deno).
- **Banco de Dados:** PostgreSQL.
- **Monitoramento:** Telemetria customizada e logs de auditoria.
