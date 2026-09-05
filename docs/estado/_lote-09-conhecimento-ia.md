# Lote 09 — Conhecimento, IA, Voz e Exportações

> **Método:** auditoria estática do código do repositório em `/home/user/fast-grava-es-v2`.
> Nenhum `.md` do repositório foi usado como fonte de verdade. **Sem acesso a runtime, banco ou
> produção** — todo comportamento de execução é `NAO_VERIFICADO`.

## Cobertura

Arquivos efetivamente abertos e verificados neste lote:

| Área | Arquivos |
|---|---|
| Base de conhecimento / fichas | `src/pages/TechnicalKnowledgeBase.tsx`, `src/components/knowledge/TechnicalSheetViewer.tsx` (694 ln), `TechnicalSheetEditor.tsx`, `KnowledgeSheetList.tsx`, `KnowledgeBaseStats.tsx`, `KnowledgeStatusBadge.tsx`, `KnowledgeSheetQRCode.tsx`, `TechnicalSheetVisualReference.tsx`, `TechnicalSheetMaterialCalculator.tsx`, `editor/EditorBasicInfo.tsx`, `editor/EditorStepsSection.tsx`, `editor/EditorMaterialsSection.tsx`, `editor/EditorTipsSection.tsx` |
| Hooks de dados | `src/hooks/useTechnicalSheets.ts`, `src/hooks/technical-sheets/useTechnicalSheetsQueries.ts`, `useTechnicalSheetMutations.ts`, `src/hooks/useTechnicalConversations.ts`, `src/hooks/useDocuments.ts` |
| Assistente técnico (IA) | `src/pages/TechnicalAssistantPage.tsx`, `src/components/technical-assistant/*` (8 arquivos), `src/components/assistant/TechnicalAssistant.tsx`, `AssistantButton.tsx`, `src/components/ai/FloatingAIAssistant.tsx` |
| Voz | `src/components/voice/VoiceCommands.tsx` |
| Documentos | `src/pages/DocumentsPage.tsx`, `src/components/documents/DocumentsList.tsx`, `DocumentUploadModal.tsx`, `DocumentViewer.tsx`, `src/components/jobs/JobInstructionsTab.tsx` |
| Exportações | `src/lib/pdfExport.ts`, `excelExport.ts`, `excel.ts`, `oeeExport.ts`, `spcExport.ts`, `calendarExports.ts`, `shiftReportPdf.ts` |
| Edge Functions | `supabase/functions/technical-assistant/index.ts` (549 ln, lido integralmente), `pdf-generator/index.ts`, `excel-export/index.ts`, `image-optimizer/index.ts` |
| Migrations | `20251213121106_*.sql` (technical_conversations/messages), `20251213164630_*.sql` (technical_sheets + RLS), `20251220150808_*.sql` (technical_documents/document_versions/bucket), `20260509121953_*.sql` (view_count + RPC), `20260619155918_*.sql` (grants) |
| Infra | `src/lib/edgeFunctionFetch.ts`, `src/routes/AppRoutes.tsx`, `src/providers/AppProviders.tsx`, `src/components/design-system/ProductDesignProvider.tsx` |

**Fora de cobertura:** não existem tabelas com prefixo `knowledge_*` no repositório (`grep` em
`supabase/migrations/` retorna zero); o domínio usa `technical_sheets*`, `technical_documents`,
`document_versions`, `technical_conversations`, `technical_messages`.

**Sem testes:** nenhum arquivo em `src/test/` ou `tests/e2e/` cobre fichas técnicas, assistente,
voz ou documentos (`grep -rln "TechnicalSheet|technical-assistant|Knowledge|Documents" src/test tests/e2e` → vazio).

## Inventário de funcionalidades

| Funcionalidade | Classificação | Evidência (arquivo:linha) | O que falta / observação |
|---|---|---|---|
| **Chat com IA — chamada real de LLM** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/TechnicalAssistantPage.tsx:215`; envio `TechnicalAssistantPage.tsx:86` → `src/lib/edgeFunctionFetch.ts:24`; backend `supabase/functions/technical-assistant/index.ts:498-516` (POST `https://ai.gateway.lovable.dev/v1/chat/completions`, modelo `google/gemini-2.5-flash`, `stream:true`); persistência `src/hooks/useTechnicalConversations.ts:179-189` (`technical_messages`); tabela `supabase/migrations/20251213121106_...sql:11` | É LLM real, **não** canned. Provedor: **Lovable AI Gateway**; chave `LOVABLE_API_KEY` via `Deno.env.get` (`index.ts:470`). Execução real `NAO_VERIFICADO`. |
| Auth obrigatória no endpoint de IA | ✅ IMPLEMENTADO_TOTAL | `supabase/functions/technical-assistant/index.ts:418-436` (valida `Authorization`, `auth.getUser()`, 401 se ausente) | — |
| Validação de payload da IA (limites) | ✅ IMPLEMENTADO_TOTAL | `technical-assistant/index.ts:406-468` (`MAX_MESSAGES=40`, `MAX_MESSAGE_CHARS=8000`, `MAX_CUSTOM_KNOWLEDGE_CHARS=20000`) | — |
| Detecção de técnica → injeção de contexto no prompt | ✅ IMPLEMENTADO_TOTAL | `technical-assistant/index.ts:372-404` (`detectTechnique`, keywords), `index.ts:7-332` (`techniqueKnowledge`, 13 técnicas hardcoded), `index.ts:484-491` | Base é **hardcoded no arquivo da função**, não vem do banco. |
| `customKnowledge` (injetar base de conhecimento no prompt) | ⬛ MORTO_OU_ABANDONADO | Backend aceita e usa: `technical-assistant/index.ts:439`, `:463`, `:494-496`. Grep `customKnowledge` em `src/` → **zero ocorrências** | Nenhum caller envia o campo. **A base de fichas técnicas (`technical_sheets`) nunca alimenta o assistente.** |
| CRUD de conversas (criar/renomear/excluir) | ✅ IMPLEMENTADO_TOTAL | UI `src/components/technical-assistant/ConversationSidebar.tsx:1-178` via `TechnicalAssistantPage.tsx:195-213`; lógica `TechnicalAssistantPage.tsx:63-83`; persistência `src/hooks/useTechnicalConversations.ts:67-136`; RLS `supabase/migrations/20251213121106_...sql:24-42` | — |
| Busca/filtro por data nas conversas | ✅ IMPLEMENTADO_TOTAL | `src/pages/TechnicalAssistantPage.tsx:45-59` (fuzzy por título + `isToday/isThisWeek/isThisMonth`) | Filtro client-side puro. |
| Busca dentro das mensagens + highlight | ✅ IMPLEMENTADO_TOTAL | `src/components/technical-assistant/ChatArea.tsx:51-58`, `:88-95`, `:207-208` | — |
| Streaming SSE + render incremental | ✅ IMPLEMENTADO_TOTAL | `src/pages/TechnicalAssistantPage.tsx:92-123` (reader/decoder, parse `data: `) | Parser da página quebra linhas por chunk (`:100`) e pode perder JSON parcial (`:119` engole erro); a versão em `src/components/assistant/TechnicalAssistant.tsx:78-115` faz buffering correto. Duplicação divergente. |
| Render Markdown das respostas | ✅ IMPLEMENTADO_TOTAL | `src/components/technical-assistant/ChatMessage.tsx:70-84` (`react-markdown` + `remark-gfm`), dep `package.json:95` | — |
| **Mermaid — render de diagramas técnicos** | 🟨 IMPLEMENTADO_PARCIAL | Componente `src/components/technical-assistant/TechnicalArtifacts.tsx:10-56` (`mermaid.initialize`, `mermaid.render`); único consumidor `src/components/technical-assistant/ChatMessage.tsx:8` e `:76-78` (fence ```` ```mermaid ````) | É o **único** uso de mermaid no app (`grep -rn "mermaid" src/` → só esses 2 arquivos). O `systemPrompt` (`technical-assistant/index.ts:334-369`) **nunca pede diagramas mermaid**, então o caminho provavelmente nunca dispara. Render usa `dangerouslySetInnerHTML` (`:52`) mitigado por `securityLevel:'strict'` (`:13`). |
| `ParameterTable` (tabela de parâmetros extraídos) | ⬛ MORTO_OU_ABANDONADO | Definido em `src/components/technical-assistant/TechnicalArtifacts.tsx:62-130`. `grep -rn "ParameterTable" src/` → só a própria definição | Nenhum importador. Contém ainda botão "Sincronizar Tudo" que só emite toast (`:89-91`). |
| `BiometricSecurity` (verificação biométrica) | ⬛ MORTO_OU_ABANDONADO | `src/components/technical-assistant/BiometricSecurity.tsx:6-26`. `grep -rn "BiometricSecurity" src/` → só o próprio arquivo | Nenhum importador; é apenas markup + `onVerify` prop. |
| `SafetyAlert` (alerta de limite de segurança) | 🟦 SUGERIDO_OU_INICIADO | Componente `src/components/technical-assistant/SafetyAlert.tsx:14-59`; único gatilho `src/components/technical-assistant/ChatMessage.tsx:85` — `content.includes('800 mm/s')` | Gatilho **hardcoded numa string literal**; parâmetro/limite fixos (`:88-90`); `onConfirm` só faz `toast.success("Bypass autorizado")` (`:91`). Não há checagem real contra limites de máquina. |
| `FileAnalyzer` (anexar manual/foto para análise) | 🟦 SUGERIDO_OU_INICIADO | `src/components/technical-assistant/FileAnalyzer.tsx:6-24`; uso `ChatArea.tsx:276-278` | O arquivo **nunca é enviado**: o callback só concatena `[DOCUMENTO TÉCNICO: nome]` no input (`ChatArea.tsx:277`). Sem upload, sem OCR, sem multimodal. `dragActive` é setado só no estado inicial (`FileAnalyzer.tsx:7`) — handlers de drag inexistentes. |
| Entrada por voz no chat da IA (botão Mic) | 🟦 SUGERIDO_OU_INICIADO | `src/components/technical-assistant/ChatArea.tsx:281-288` | `<Button>` com `title="Entrada por Voz (Industrial Mode)"` **sem `onClick`**. Nenhuma ligação com `useVoiceCommands`. |
| "Copiar Tudo" / "Gerar PDF Técnico" (rodapé do chat) | 🟦 SUGERIDO_OU_INICIADO | `src/components/technical-assistant/ChatArea.tsx:327-332` | Dois `<Button>` **sem `onClick`**. |
| "Gerar JSON" / "Aplicar Parâmetros" / "Compartilhar diagnóstico" | 🟦 SUGERIDO_OU_INICIADO | `src/components/technical-assistant/ChatMessage.tsx:111` (Share2), `:129-136` | Todos **sem `onClick`**. |
| Feedback 👍/👎 na resposta da IA | 🟨 IMPLEMENTADO_PARCIAL | `src/components/technical-assistant/ChatMessage.tsx:21`, `:113-124` | Só `useState` local; **nada é persistido** nem enviado. |
| Copiar resposta da IA | ✅ IMPLEMENTADO_TOTAL | `src/components/technical-assistant/ChatMessage.tsx:23-28` (`navigator.clipboard.writeText`) + `:108-110` | — |
| "Diagnostic Mode" (toggle no chat) | 🟦 SUGERIDO_OU_INICIADO | `src/components/technical-assistant/ChatArea.tsx:49`, `:319-324` | Só altera `className` (`:246`). Não muda prompt, modelo nem payload. |
| Cabeçalho "CPU: 4% / LAT: 12ms / ELITE 10/10" | 🟦 SUGERIDO_OU_INICIADO | `src/components/technical-assistant/ChatArea.tsx:108`, `:112-113` | Strings literais no JSX; não há telemetria por trás. |
| Botão "Exportar SPC" na página do assistente | 🟦 SUGERIDO_OU_INICIADO | `src/pages/TechnicalAssistantPage.tsx:170-182` | `onClick` só emite `toast.info("Relatório SPC gerado...")` com nome de arquivo fictício. **Nenhum download acontece.** |
| Badge "Sincronizado com SPC" / "Status: Online" | 🟦 SUGERIDO_OU_INICIADO | `src/pages/TechnicalAssistantPage.tsx:163-167` | Estático no JSX. |
| **Painel de Telemetria Industrial** | 🟦 SUGERIDO_OU_INICIADO | `src/components/technical-assistant/TechnicalTelemetryPanel.tsx:11-19` (`generateMockData` com `Math.random()`), `:25-39` (setInterval que gera mais números aleatórios) | **100% dados sintéticos.** "API Latency 12ms" (`:174`), "GPU Clusters 4 active" (`:182`) e o "Alerta de Manutenção — vibração anômala no eixo Z" (`:188-196`) são literais fixos. Botão "Visualizar Logs Completos" (`:200-202`) **sem `onClick`**. |
| Assistente flutuante global `AssistantButton` → `TechnicalAssistant` | ✅ IMPLEMENTADO_TOTAL | Montagem `src/components/layout/MainLayout.tsx:18` e `:231`; modal `src/components/assistant/AssistantButton.tsx:59`; chat real `src/components/assistant/TechnicalAssistant.tsx:57-116` (mesmo endpoint `technical-assistant`) | Duplica ~100% da lógica de streaming da página. Não persiste conversas (só `useState`, `:46`). |
| **`FloatingAIAssistant` — respostas FAKE** | 🟨 IMPLEMENTADO_PARCIAL | `src/components/ai/FloatingAIAssistant.tsx:70-88` — comentário `// Simulate AI response` + `setTimeout(...,1500)` sorteando de um array de 4 frases (`:72-77`) | **Não chama LLM nenhum.** Está montado globalmente por padrão: `src/components/design-system/ProductDesignProvider.tsx:33` (`enableAIAssistant = true`) e `:57`, dentro de `src/providers/AppProviders.tsx:46-52` (que **não** passa a prop). Resultado: **dois botões flutuantes de IA sobrepostos** em `bottom-6 right-6` (`FloatingAIAssistant.tsx:105` vs `AssistantButton.tsx:31`), um real e um falso. |
| **Reconhecimento de voz (STT)** | ✅ IMPLEMENTADO_TOTAL | `src/components/voice/VoiceCommands.tsx:62-115` — Web Speech API real (`window.SpeechRecognition \|\| window.webkitSpeechRecognition`), `interimResults`, `lang='pt-BR'`, matching por regex `:86-92`; UI `:257-281`; feature-detection com render nulo `:255` | API do browser real, não esqueleto. Suporte real por browser `NAO_VERIFICADO`. |
| **Síntese de voz (TTS)** | ✅ IMPLEMENTADO_TOTAL | `src/components/voice/VoiceCommands.tsx:340-358` (`SpeechSynthesisUtterance`, `window.speechSynthesis.speak`), consumido em `:158` e `:248-253` | — |
| Comandos de voz → ação real | 🟨 IMPLEMENTADO_PARCIAL | Definições `src/components/voice/VoiceCommands.tsx:160-230`; consumidores: só `src/pages/OperatorView.tsx:119` (navega p/ kiosk) e `src/pages/ExecutiveDashboard.tsx:269-272` (só `toast.info`) | `VoiceButton` é montado em ≥12 páginas **sem `onCommand`** (ex.: `src/pages/OEEDashboard.tsx:357`, `KPIDashboard.tsx:319`, `MachinesPage.tsx:188`, `SecurityDashboard.tsx:90`, `TPMDashboard.tsx:135`, `GamificationPage.tsx:115`) → o comando é reconhecido e falado, mas **não executa nada**. |
| Respostas de voz com números fixos | 🟦 SUGERIDO_OU_INICIADO | `src/components/voice/VoiceCommands.tsx:192` ("92% de eficiência"), `:201` ("8 jobs em produção ativa") | Strings hardcoded; não consultam o banco. |
| `VoiceFeedbackButton` | ⬛ MORTO_OU_ABANDONADO | `src/components/voice/VoiceCommands.tsx:361-390`. `grep -rn "VoiceFeedbackButton" src/` → só a definição | Sem importador. |
| Listagem/filtro/busca fuzzy de fichas técnicas | ✅ IMPLEMENTADO_TOTAL | UI `src/components/knowledge/KnowledgeSheetList.tsx:62-247`; filtros `src/pages/TechnicalKnowledgeBase.tsx:69-89`; query `src/hooks/technical-sheets/useTechnicalSheetsQueries.ts:19-48` (`technical_sheets` + joins); tabela `supabase/migrations/20251213164630_...sql:21` | — |
| Deep-link `?sheet=<id>` | ✅ IMPLEMENTADO_TOTAL | `src/pages/TechnicalKnowledgeBase.tsx:31`, `:53-65` | — |
| Realtime das fichas | ✅ IMPLEMENTADO_TOTAL | `src/hooks/technical-sheets/useTechnicalSheetsQueries.ts:46-48` (`useRealtimeChannel` → invalidate) | Publicação realtime no banco `NAO_VERIFICADO`. |
| Criar / editar / duplicar / desativar ficha | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/TechnicalKnowledgeBase.tsx:100-134`, `:206-226`; editor `src/components/knowledge/TechnicalSheetEditor.tsx:104-139`; mutations `src/hooks/technical-sheets/useTechnicalSheetMutations.ts:11-89`; RLS `supabase/migrations/20251213164630_...sql:88` | Delete é soft (`is_active=false`, `useTechnicalSheetMutations.ts:78`). |
| Passos / materiais / dicas da ficha (CRUD) | ✅ IMPLEMENTADO_TOTAL | UI `src/components/knowledge/editor/EditorStepsSection.tsx:24-35`, `EditorMaterialsSection.tsx`, `EditorTipsSection.tsx`; mutations `useTechnicalSheetMutations.ts:91-233`; leitura `useTechnicalSheetsQueries.ts:130-195` | Só editáveis em ficha já existente (`TechnicalSheetEditor.tsx:166`). |
| Parâmetros de máquina + faixas min/máx | ✅ IMPLEMENTADO_TOTAL | Editor `src/components/knowledge/editor/EditorBasicInfo.tsx:155-258`; save `TechnicalSheetEditor.tsx:115-126` (JSON `machine_settings`/`settings_ranges`); viewer `TechnicalSheetViewer.tsx:387-424` | — |
| Checklist de qualidade da ficha | ✅ IMPLEMENTADO_TOTAL | Editor `EditorBasicInfo.tsx:283-336`; save `TechnicalSheetEditor.tsx:132`; viewer `TechnicalSheetViewer.tsx:463-479`; PDF `TechnicalSheetViewer.tsx:114-125` | — |
| Checklist de execução (marcar passos) | 🟨 IMPLEMENTADO_PARCIAL | `src/components/knowledge/TechnicalSheetViewer.tsx:55-67`, `:294-321`, `:552-559` | Progresso é `useState` local; **nada é persistido** — recarregar a página zera. |
| `consumables` (insumos alternativos) | 🟨 IMPLEMENTADO_PARCIAL | Editor `EditorBasicInfo.tsx:355-434`; persistido `TechnicalSheetEditor.tsx:133`; consumido em `src/features/maintenance/components/ExecutionDetailsModal.tsx:431` | **Não é exibido em `TechnicalSheetViewer.tsx`** — grava-se na ficha mas o leitor da ficha não mostra. |
| Referência visual (padrão ouro / falha) | 🟨 IMPLEMENTADO_PARCIAL | Viewer `src/components/knowledge/TechnicalSheetVisualReference.tsx:11-64` (com `sanitizeUrl`, `:23`/`:48`); campo `TechnicalSheetViewer.tsx:345-348`; editor `EditorBasicInfo.tsx:445-462` | Editor só aceita **URL digitada à mão** — não existe upload de imagem para a ficha (nenhum `supabase.storage` no fluxo). |
| Calculadora de insumos + cruzamento com estoque | ✅ IMPLEMENTADO_TOTAL | `src/components/knowledge/TechnicalSheetMaterialCalculator.tsx:51-98`; dados `TechnicalSheetViewer.tsx:53` (`useInventory`) e `:529-534` | Escala assume base 100 un. (`:58`) e casa material por `includes` de nome (`:61`) — heurística frágil. |
| QR Code da ficha (gerar / baixar SVG / imprimir) | ✅ IMPLEMENTADO_TOTAL | `src/components/knowledge/KnowledgeSheetQRCode.tsx:12-73` (`qrcode.react`, `XMLSerializer`, `window.print`, `escapeHtml` em `:33`); acionado por `TechnicalSheetViewer.tsx:264-266`, `:687-691` | — |
| Favoritar ficha | ✅ IMPLEMENTADO_TOTAL | UI `TechnicalSheetViewer.tsx:250-258` e `KnowledgeSheetList.tsx:57-60`, `:114-139`; mutation `useTechnicalSheetMutations.ts:235-260` (`technical_sheet_favorites`); query `useTechnicalSheetsQueries.ts:229-247` | — |
| Histórico de auditoria da ficha | ✅ IMPLEMENTADO_TOTAL | UI `TechnicalSheetViewer.tsx:623-682`; query `useTechnicalSheetsQueries.ts:206-227` (`technical_sheet_audit` + join `profiles`); trigger `supabase/migrations/20260509121606_...sql:52-60` | — |
| Tabela `technical_sheet_audit_logs` (2ª tabela de auditoria) | ⬛ MORTO_OU_ABANDONADO | Criada em `supabase/migrations/20260509120259_...sql:13` e populada por trigger `:47`. `grep -rn "technical_sheet_audit_logs" src/ supabase/functions/` → só `src/integrations/supabase/types.ts:4697` (tipo gerado) | Duplicata abandonada de `technical_sheet_audit` (`20260509121606_...sql:7`). Nenhum leitor. |
| **Contador de acessos da ficha (`view_count`)** | 🟨 IMPLEMENTADO_PARCIAL | Exibido em `TechnicalSheetViewer.tsx:242` e agregado em `KnowledgeBaseStats.tsx:14`. RPC existe: `supabase/migrations/20260509121953_...sql:5-9`. `grep -rn "increment_sheet_view_count" src/` → **só `src/integrations/supabase/types.ts:6072`** | **Nunca é incrementado pelo app.** Além disso `supabase/migrations/20260619155918_...sql:2-4` revoga o `EXECUTE` de `authenticated` e concede só a `service_role` — o cliente não conseguiria chamar. Métrica exibida ficará sempre 0/estática. |
| Status da ficha (Rascunho / Revisão / Homologada) | 🟨 IMPLEMENTADO_PARCIAL | Badge `src/components/knowledge/KnowledgeStatusBadge.tsx:10-33`; usado em `TechnicalSheetViewer.tsx:232` e `KnowledgeSheetList.tsx:201` | **Não há UI para alterar `status`**: `grep -n "status" src/components/knowledge/editor/*.tsx src/components/knowledge/TechnicalSheetEditor.tsx` → zero. Só mudaria via banco. |
| Versão da ficha (`version`) | 🟨 IMPLEMENTADO_PARCIAL | Exibida `TechnicalSheetViewer.tsx:233`; campo no form `EditorBasicInfo.tsx:113-114` (`<Input ... disabled>`); carregada `TechnicalSheetEditor.tsx:99` | **`version` não entra no `payload` de save** (`TechnicalSheetEditor.tsx:106-136`) e só é setada em `create` (`useTechnicalSheetMutations.ts:32`, fixo `1`). Não há bump de versão pelo app (a ação `VERSION_BUMP` é tratada no viewer, `:650`, mas nada a produz). |
| Exportar ficha técnica em PDF | ✅ IMPLEMENTADO_TOTAL | `src/components/knowledge/TechnicalSheetViewer.tsx:69-172` (`import('jspdf')` dinâmico, `doc.save()` em `:167`); botão `:267-270` | Client-side puro. Layout manual sem `autoTable`; emojis (`:141`, `:159`) podem não renderizar nas fontes padrão do jsPDF. |
| Permissão de edição da base | 🟨 IMPLEMENTADO_PARCIAL | `src/pages/TechnicalKnowledgeBase.tsx:91` — `const canEdit = role === 'coordinator'` | Compara string única; RLS do banco aceita coordinator (`20251213164630_...sql:88`). `manager`/`admin` não editam pela UI. Rota `/knowledge` não declara `allowedRoles` (`src/routes/AppRoutes.tsx:229`). |
| Upload de documento técnico (storage + registro) | ✅ IMPLEMENTADO_TOTAL | UI `src/components/documents/DocumentUploadModal.tsx:60-75`; hook `src/hooks/useDocuments.ts:70-119` (`storage.from('technical-documents').upload` + insert em `technical_documents`); bucket `supabase/migrations/20251220150808_...sql:74-82` | — |
| Listar / buscar / filtrar documentos | ✅ IMPLEMENTADO_TOTAL | `src/pages/DocumentsPage.tsx:22` → `src/components/documents/DocumentsList.tsx:34-49`; query `src/hooks/useDocuments.ts:45-67` | — |
| Visualizar documento (PDF/imagem) + download | ✅ IMPLEMENTADO_TOTAL | `src/components/documents/DocumentViewer.tsx:52-96` (`<img>`, `<iframe>`, `<a download>`) | — |
| Excluir documento | ✅ IMPLEMENTADO_TOTAL | UI `src/components/documents/DocumentsList.tsx:240`; hook `src/hooks/useDocuments.ts:274-291` | Remove só a linha; **o objeto no storage não é apagado** (`useDocuments.ts:278-281`). |
| **Aprovação / rejeição de documento** | ⬛ MORTO_OU_ABANDONADO | Mutations implementadas: `src/hooks/useDocuments.ts:223-246` (`approveDocument`) e `:248-272` (`rejectDocument`). `grep -rn "approveDocument\|rejectDocument" src/` → **apenas a definição e o `return`** (`:299-300`) | Nenhum componente consome. A `DocumentsList` só desestrutura `deleteDocument` (`DocumentsList.tsx:40`). O subtítulo da página promete "versionamento e aprovação" (`src/pages/DocumentsPage.tsx:18`) — não existe UI. |
| **Versionamento de documento** | ⬛ MORTO_OU_ABANDONADO | `src/hooks/useDocuments.ts:136-221` (`createVersion`, grava em `document_versions`) e `:305+` (`useDocumentVersions`). `grep -rn "createVersion\|useDocumentVersions"` → só o próprio hook | Sem UI. Tabela `document_versions` (`supabase/migrations/20251220150808_...sql:23`) nunca recebe escrita pelo app. |
| Documentos anexos na aba de instruções do job | ✅ IMPLEMENTADO_TOTAL | `src/components/jobs/JobInstructionsTab.tsx:44` (`useDocuments(selectedSheet?.id)`), `:30-43` | — |
| Export PDF executivo (jsPDF + autoTable) | ✅ IMPLEMENTADO_TOTAL | `src/lib/pdfExport.ts:38-40`, `:89`, `:240`; caller `src/pages/ExecutiveDashboard.tsx:13` | Import dinâmico + API v5 correta (`autoTable(doc, ...)`). |
| Export PDF de BI (produção/perdas/atrasos) | ✅ IMPLEMENTADO_TOTAL | `src/lib/pdfExport.ts:288`, `:355`, `:410`; caller `src/features/admin/hooks/useBIExport.ts:4` | — |
| Export Excel executivo | ✅ IMPLEMENTADO_TOTAL | `src/lib/excelExport.ts:11-50` → `src/lib/excel.ts:58-62` (`exceljs` + `file-saver`); caller `src/pages/ExecutiveDashboard.tsx:14` | — |
| Wrapper Excel compartilhado (`downloadWorkbook`) | ✅ IMPLEMENTADO_TOTAL | `src/lib/excel.ts:31-62`; callers `src/lib/excelExport.ts:42`, `src/pages/ReportBuilderPage.tsx:274`, `src/features/maintenance/components/TPMReports.tsx:157`; teste `src/lib/excel.test.ts:36` | Migração consciente de `xlsx`→`exceljs` documentada em `excel.ts:4-11`. |
| Export SPC (PDF) | ✅ IMPLEMENTADO_TOTAL | `src/lib/spcExport.ts:20-80`; caller `src/pages/SPCDashboard.tsx:19` | Usa API v5 correta (`autoTable(doc, ...)`, `:39`). |
| Export de calendário (PDF via html2canvas + iCal) | ✅ IMPLEMENTADO_TOTAL | `src/lib/calendarExports.ts:13-64`, `:66-124`; caller `src/pages/DailyCalendar.tsx:35` | — |
| Export de relatório de turno (PDF) | ✅ IMPLEMENTADO_TOTAL | `src/lib/shiftReportPdf.ts:15-118`; caller `src/components/shift/AutoShiftSummary.tsx:7` | — |
| **`src/lib/oeeExport.ts`** | ⬛ MORTO_OU_ABANDONADO | `grep -rn "exportOEETabledData" src/` → **só `src/test/exportRegression.test.ts` e `src/test/exportSimulation.test.ts`**. Nenhuma página importa | Além de morto, o caminho PDF está **quebrado**: `src/lib/oeeExport.ts:46` chama `doc.autoTable({...})` (API v3), mas `jspdf-autotable@5.0.8` só aplica o plugin se existir `window.jsPDF`/`window.jspdf` global (ver `node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.mjs`, bloco `try { if (typeof window !== 'undefined') ... applyPlugin }`) — o que não ocorre num bundle ESM Vite. Os testes passam porque **mockam** o jsPDF com `autoTable` (`src/test/exportRegression.test.ts:19-27`). |
| Edge Function `pdf-generator` | 🟨 IMPLEMENTADO_PARCIAL | `supabase/functions/pdf-generator/index.ts:4-8` (comentário: "NÃO gera PDFs binários hoje… relatório em texto plano"); resposta `:104-109` com `Content-Type: text/plain`; auth+RBAC `:28-70`. Único caller: `src/features/maintenance/components/ExecutionDetailsModal.tsx:165` | **Fio quebrado:** o cliente embrulha a resposta em `new Blob([data], { type: 'application/pdf' })` e baixa como `.pdf` (`ExecutionDetailsModal.tsx:180-183`) → arquivo `.pdf` com bytes de texto. Fallback silencioso p/ `window.print()` (`:188`). |
| Edge Function `excel-export` | ⬛ MORTO_OU_ABANDONADO | `supabase/functions/excel-export/index.ts:1-70` (auth + RBAC + `ALLOWED_TABLES`). `grep -rn "excel-export" src/` → **zero** | Função server-side completa sem nenhum caller: todo o Excel do app é client-side (`src/lib/excel.ts`). Refactor client-side abandonou o backend. |
| Edge Function `image-optimizer` | ⬛ MORTO_OU_ABANDONADO | `supabase/functions/image-optimizer/index.ts:1-6` (comentário: "STUB — não implementada… retornava os bytes originais sem otimizar") e `:12-24` (responde **501**). `grep -rn "image-optimizer" src/` → **zero** | Stub honesto e sem callers. Também não há otimização client-side (`grep -rn "browser-image-compression\|imageCompression" src/ package.json` → zero). |

## Integrações de IA e provedores

| Item | Achado | Evidência |
|---|---|---|
| Provedor de LLM | **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`), API compatível com OpenAI | `supabase/functions/technical-assistant/index.ts:498` |
| Modelo | `google/gemini-2.5-flash`, `stream: true` | `technical-assistant/index.ts:506`, `:514` |
| Origem da chave | `Deno.env.get("LOVABLE_API_KEY")` — secret da Edge Function; erro se ausente | `technical-assistant/index.ts:470-474` |
| Chave exposta ao browser? | **Não.** O front chama a Edge Function via `edgeFunctionFetch`, com o access token do usuário | `src/lib/edgeFunctionFetch.ts:12-24`; `src/pages/TechnicalAssistantPage.tsx:86` |
| Resposta canned? | **Não** no `technical-assistant`. **Sim** no `FloatingAIAssistant` (array de 4 frases + `setTimeout`) | `src/components/ai/FloatingAIAssistant.tsx:70-88` |
| Timeout / tratamento de erro | `AbortSignal.timeout(25_000)`; 429 e 402 mapeados para mensagens específicas | `technical-assistant/index.ts:500`, `:519-530` |
| RAG / grounding na base própria | **Ausente.** O `customKnowledge` existe no backend mas nenhum cliente envia; `technical_sheets` nunca chega ao prompt | `technical-assistant/index.ts:494-496` vs. grep vazio em `src/` |
| Base de conhecimento do modelo | 13 blocos Markdown hardcoded no próprio arquivo da função (~325 linhas) | `technical-assistant/index.ts:7-332` |
| Outros provedores de IA no lote | Nenhum. `ml-predictions` existe em `supabase/functions/` mas está fora deste lote | — |
| Voz | Web Speech API **nativa do browser** (STT + TTS). Sem Whisper/ElevenLabs/provedor externo | `src/components/voice/VoiceCommands.tsx:67`, `:344-350` |
| Runtime | Se o gateway responde, se a chave está configurada e se o modelo está disponível: **NAO_VERIFICADO** | — |

## Achados relevantes

1. **A "base de conhecimento" e o "assistente de IA" são dois sistemas desconectados.** O assistente
   responde a partir de 325 linhas hardcoded em `supabase/functions/technical-assistant/index.ts:7-332`,
   enquanto as fichas reais vivem em `technical_sheets`. O parâmetro que uniria os dois (`customKnowledge`,
   `index.ts:494-496`) **não é enviado por nenhum caller**. Fichas editadas na UI não influenciam a IA.

2. **Dois assistentes flutuantes sobrepostos, um deles falso.** `AssistantButton` (real, `MainLayout.tsx:231`)
   e `FloatingAIAssistant` (canned, `ProductDesignProvider.tsx:57` com default `enableAIAssistant = true` e
   `AppProviders.tsx:46-52` não sobrescrevendo) renderizam ambos em `bottom-6 right-6`.

3. **Camada de "chrome industrial" sem lógica.** No assistente há um conjunto grande de controles
   decorativos: botão de voz (`ChatArea.tsx:281-288`), "Copiar Tudo"/"Gerar PDF Técnico" (`:327-332`),
   "Gerar JSON"/"Aplicar Parâmetros" (`ChatMessage.tsx:129-136`), "Exportar SPC" que só emite toast
   (`TechnicalAssistantPage.tsx:174-182`) e o painel de telemetria inteiramente sintético
   (`TechnicalTelemetryPanel.tsx:11-19`) com alerta de manutenção fixo (`:188-196`).

4. **`SafetyAlert` dispara por string literal.** `ChatMessage.tsx:85` testa `content.includes('800 mm/s')`.
   Não há comparação contra limites reais de máquina, e o "bypass biométrico" apenas emite toast (`:91`).

5. **Documentos: versionamento e aprovação existem no hook e não existem na UI.** `approveDocument`,
   `rejectDocument`, `createVersion` e `useDocumentVersions` (`src/hooks/useDocuments.ts:136-272`, `:305+`)
   não têm um único consumidor, apesar de a página anunciar o recurso (`DocumentsPage.tsx:18`).
   Consequência prática: documentos nascem `status:'pending'` (`useDocuments.ts:113`) e, pela RLS
   `"Anyone can view approved documents"` (`20251220150808_...sql:46-49`), usuários não-coordenadores/gerentes
   não os enxergam — e não há caminho no app para aprová-los.

6. **`view_count` é fachada.** Exibido em dois lugares (`TechnicalSheetViewer.tsx:242`,
   `KnowledgeBaseStats.tsx:14`), com RPC existente (`20260509121953_...sql:5`) mas **sem nenhuma chamada
   no cliente** e com `EXECUTE` revogado de `authenticated` (`20260619155918_...sql:2-4`).

7. **Exportações: client-side venceu, o server-side ficou órfão.** PDF/Excel de produção rodam no browser
   (`src/lib/pdfExport.ts`, `src/lib/excel.ts`). As Edge Functions `excel-export` e `image-optimizer` não
   têm nenhum caller; `image-optimizer` é um stub 501 assumido (`index.ts:1-6`). `pdf-generator` continua
   sendo chamado (`ExecutionDetailsModal.tsx:165`) mas devolve **texto plano** que o cliente rotula como PDF.
   Isso caracteriza um refactor duplicado/abandonado, não coexistência intencional.

8. **`src/lib/oeeExport.ts` está morto e provavelmente quebrado.** Único consumo é em testes, e o caminho
   PDF usa a API antiga `doc.autoTable(...)` (`:46`) incompatível com `jspdf-autotable@5.0.8` fora de um
   contexto com `window.jsPDF` global. Os testes escondem isso via mock (`src/test/exportRegression.test.ts:19-27`).
   *(Falha em runtime: `NAO_VERIFICADO` — inferida por leitura do módulo em `node_modules`.)*

9. **Mermaid é dependência de ~1 caminho improvável.** `mermaid@^11.15.0` (`package.json:83`) só é usado em
   `TechnicalArtifacts.tsx:32`, acionado por fence ```` ```mermaid ```` (`ChatMessage.tsx:76`), mas o system
   prompt nunca instrui o modelo a produzir mermaid (`technical-assistant/index.ts:334-369`).

10. **Duplicação divergente do parser SSE.** `TechnicalAssistantPage.tsx:92-123` faz split por chunk e engole
    JSON parcial (`:119`), enquanto `src/components/assistant/TechnicalAssistant.tsx:78-115` implementa
    buffering correto por linha. Duas implementações do mesmo protocolo, uma pior.

11. **Componentes órfãos confirmados por grep:** `BiometricSecurity` (`BiometricSecurity.tsx:6`),
    `ParameterTable` (`TechnicalArtifacts.tsx:62`), `VoiceFeedbackButton` (`VoiceCommands.tsx:361`),
    tabela `technical_sheet_audit_logs` (`20260509120259_...sql:13`).

12. **Bucket `technical-documents` é público** (`20251220150808_...sql:74-79`, `public = true`) com policy de
    SELECT sem qualquer condição de auth (`:84-87`). Documentos técnicos ficam acessíveis por URL direta a
    quem tiver o link, independentemente da RLS da tabela. *(Configuração efetiva em produção: NAO_VERIFICADO.)*

13. **Nenhum teste** (unitário ou e2e) cobre este domínio.

## Limitações

- **Sem runtime, banco ou produção.** Nada aqui afirma "em uso real". Todas as conclusões vêm de leitura
  estática de código e SQL de migrations. Estado efetivo do schema, das policies aplicadas, dos secrets
  (`LOVABLE_API_KEY`), do publication de realtime e do conteúdo das tabelas: **NAO_VERIFICADO**.
- Migrations são o histórico versionado; migrações posteriores podem ter alterado policies/colunas fora do
  que foi lido. Foram verificadas as migrations que o `grep` associou a cada tabela do escopo, não as 100+ do repositório.
- "Morto" significa **nenhum importador/caller encontrado por `grep` no repositório** (`src/`, `supabase/`,
  `tests/`). Não exclui uso por código externo, deploys manuais das Edge Functions ou chamadas via MCP/HTTP direto.
- Caminhos condicionais (ex.: o render mermaid) foram classificados pela existência do gatilho no código,
  não por observação de execução.
- Não foram auditados os arquivos fora do escopo do lote (ML predictions, ERP API, Bitrix24, notificações,
  demais dashboards) mesmo quando compartilham utilitários de export.
