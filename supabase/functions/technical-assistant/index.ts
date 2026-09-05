import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders } from "../_shared/cors.ts";

// Conhecimento técnico por técnica
const techniqueKnowledge: Record<string, string> = {
  fiber_laser: `
## Fiber Laser (Gravação a Laser Fibra)
### Princípio de Funcionamento
- Usa laser de fibra óptica dopada com íons de terras raras (érbio, neodímio, itérbio)
- Comprimento de onda típico: 1064nm
- Potência: 20W a 100W dependendo da aplicação

### Materiais Compatíveis
- Metais: aço inox, alumínio, latão, cobre, titânio
- Plásticos com aditivos metálicos
- Materiais revestidos

### Parâmetros Críticos
- Velocidade: 100-3000mm/s
- Potência: ajustar conforme material e profundidade desejada
- Frequência: 20-80kHz
- Espaçamento de linhas (hatch): 0.02-0.1mm

### Manutenção
- Limpeza da lente focal: semanal
- Verificação do sistema de exaustão: diária
- Calibração do foco: mensal

### Problemas Comuns
- Gravação fraca: verificar potência e foco
- Bordas queimadas: reduzir potência ou aumentar velocidade
- Gravação irregular: limpar lente ou verificar alinhamento
`,

  laser_co2: `
## Laser CO2
### Princípio de Funcionamento
- Laser de gás carbônico
- Comprimento de onda: 10.6μm
- Ideal para materiais orgânicos

### Materiais Compatíveis
- Madeira, MDF, compensado
- Acrílico, papel, papelão
- Couro, tecidos, borracha
- Vidro (gravação, não corte)

### Parâmetros Críticos
- Potência: 30W a 150W
- Velocidade: 10-500mm/s
- Resolução: 300-1200 DPI

### Manutenção
- Limpeza de espelhos: semanal
- Limpeza da lente: diária
- Verificação do tubo laser: mensal
- Troca de água do chiller: mensal

### Problemas Comuns
- Corte incompleto: aumentar potência ou reduzir velocidade
- Bordas amareladas: ajustar air assist
- Perda de potência: verificar alinhamento de espelhos
`,

  laser_uv: `
## Laser UV
### Princípio de Funcionamento
- Laser ultravioleta de estado sólido
- Comprimento de onda: 355nm
- Processo "frio" com mínimo dano térmico

### Materiais Compatíveis
- Plásticos sensíveis ao calor
- Vidro, cristal
- PCBs e componentes eletrônicos
- Materiais médicos

### Parâmetros Críticos
- Potência: 3W a 15W
- Frequência: 30-100kHz
- Velocidade: 100-1000mm/s

### Vantagens
- Marcação de alta precisão
- Sem danos térmicos
- Ideal para materiais sensíveis
`,

  silk_textil: `
## Serigrafia Têxtil (Silk Screen Têxtil)
### Processo
1. Preparação da arte (separação de cores)
2. Gravação da tela com emulsão fotossensível
3. Revelação e secagem
4. Montagem no carrossel
5. Aplicação de tinta e impressão
6. Cura em estufa ou flash

### Tipos de Tinta
- Plastisol: padrão, cura 160°C, opaco
- Base água: ecológica, toque suave
- Discharge: descarga de cor, ideal para escuros
- Foil: efeito metalizado

### Preparação de Tela
- Tensão: 18-25 N/cm²
- Mesh: 43-120 fios/cm (varia com detalhe)
- Emulsão: bicromato ou diazóico

### Problemas Comuns
- Tinta passando: tela muito aberta ou pressão excessiva
- Falhas na impressão: tela entupida ou tinta seca
- Registro incorreto: ajustar guias e pressão
`,

  silk_vinilico: `
## Serigrafia Vinílica/UV
### Diferenças do Têxtil
- Substratos rígidos: plástico, metal, vidro
- Tintas UV: cura instantânea com luz UV
- Maior durabilidade e resistência

### Tipos de Cura
- UV LED: menor consumo, maior vida útil
- UV mercúrio: mais potente, mais calor
- Tempo de cura: 0.5-3 segundos

### Substratos Comuns
- PVC, acrílico, policarbonato
- Alumínio, aço
- Vidro temperado
`,

  tampografia: `
## Tampografia
### Princípio de Funcionamento
1. Tinta depositada no clichê gravado
2. Raspa remove excesso
3. Tampão de silicone pega a tinta
4. Tampão transfere para o objeto

### Componentes
- Clichê: aço ou polímero, gravado quimicamente
- Tampão: silicone de diferentes durezas (shore)
- Tinta: base solvente, secagem rápida

### Parâmetros
- Dureza do tampão: 2-18 shore
- Pressão: ajustar conforme superfície
- Velocidade: 1000-3000 ciclos/hora

### Manutenção
- Limpeza do tampão: a cada troca de cor
- Verificação do clichê: desgaste após 50.000 ciclos
- Nível de tinta: manter consistente

### Problemas Comuns
- Imagem incompleta: ajustar pressão ou tampão
- Tinta borrada: reduzir viscosidade
- Manchas: limpar tampão ou trocar
`,

  hot_stamping: `
## Hot Stamping (Estampagem a Quente)
### Processo
1. Aquecimento da matriz metálica
2. Posicionamento da fita (foil)
3. Prensagem sobre o substrato
4. Transferência do foil por calor e pressão

### Tipos de Foil
- Metálico: ouro, prata, cobre
- Holográfico: efeitos especiais
- Pigmentado: cores sólidas
- Difração: padrões de luz

### Parâmetros
- Temperatura: 100-180°C (varia com material)
- Pressão: média a alta
- Tempo de prensagem: 1-3 segundos

### Manutenção
- Limpeza da matriz: após cada uso
- Verificação de temperatura: calibrar mensalmente
- Inspeção do foil: armazenar em local seco
`,

  prensa_termica: `
## Prensa Térmica
### Tipos
- Plana: camisetas, tecidos planos
- Caneca: sublimação em cilindros
- Boné: formato curvo específico
- Giratória: automação

### Processo de Sublimação
1. Impressão em papel sublimático (espelhado)
2. Posicionamento sobre o substrato
3. Prensagem com calor e pressão
4. Transferência do sublimático

### Parâmetros por Material
- Poliéster branco: 180°C, 45s, pressão média
- Poliéster colorido: 190°C, 50s
- Algodão com primer: 160°C, 30s
- Cerâmica resinada: 200°C, 180s

### Problemas Comuns
- Cores desbotadas: aumentar tempo ou temperatura
- Fantasma (imagem dupla): não mover durante prensagem
- Amarelamento: reduzir temperatura
`,

  sublimacao: `
## Sublimação
### Princípio
- Tinta sublimática passa de sólido para gasoso
- Penetra nas fibras de poliéster
- Resultado permanente e lavável

### Requisitos do Substrato
- Mínimo 65% poliéster (ideal 100%)
- Ou revestimento de poliéster (cerâmica, metal)
- Cores claras funcionam melhor

### Impressão
- Impressora sublimática (Epson, Sawgrass)
- Papel específico para sublimação
- Imagem espelhada
- Perfil de cor ICC adequado

### Parâmetros de Transferência
- Canecas: 200°C, 180-240s
- Tecidos: 180-200°C, 30-60s
- Mousepad: 180°C, 45s
`,

  decalque_forno: `
## Decalque para Forno (Cerâmica/Vidro)
### Processo
1. Impressão em papel decalque
2. Aplicação de verniz (cover coat)
3. Secagem do verniz
4. Transferência para água
5. Aplicação no substrato
6. Secagem e queima em forno

### Tipos de Queima
- Baixa temperatura: 600-700°C (sobre esmalte)
- Alta temperatura: 800-900°C (sob esmalte)

### Materiais
- Vidro: 560-620°C
- Cerâmica vitrificada: 750-850°C
- Porcelana: 800-900°C

### Cuidados
- Verniz uniforme: evitar bolhas
- Secagem completa antes da queima
- Rampa de temperatura adequada no forno
`,

  dtf_textil: `
## DTF Têxtil (Direct to Film)
### Processo
1. Impressão em filme PET com tinta DTF
2. Aplicação de pó adesivo (poliamida)
3. Cura do pó em forno ou prensa
4. Prensagem no tecido

### Vantagens
- Funciona em qualquer cor de tecido
- Funciona em algodão e poliéster
- Toque mais leve que plastisol
- Detalhes finos possíveis

### Parâmetros
- Temperatura de cura do pó: 120°C
- Prensagem: 160-170°C, 10-15s
- Pressão: média

### Insumos
- Filme PET (75μm recomendado)
- Tintas DTF (CMYK + Branco)
- Pó adesivo (branco ou preto)
`,

  dtf_uv: `
## DTF UV
### Diferenças do DTF Têxtil
- Usa tintas UV em vez de tintas DTF
- Cura UV instantânea
- Funciona em substratos rígidos

### Substratos
- Plásticos, metal, vidro
- Madeira, cerâmica
- Qualquer superfície lisa

### Processo
1. Impressão com tinta UV + branco
2. Aplicação de verniz UV
3. Transferência com laminadora
4. Aplicação no substrato
`,

  corte_midia: `
## Corte de Mídia (Plotter de Recorte)
### Tipos de Corte
- Contorno: recorte de adesivos
- Kiss-cut: corta vinil, não o liner
- Through-cut: corta tudo

### Materiais
- Vinil adesivo: 0.08-0.1mm
- Vinil termo-transfer: HTV
- Papel, cartolina
- Flock, glitter

### Parâmetros
- Pressão da lâmina: ajustar por material
- Velocidade: 10-60 cm/s
- Offset da lâmina: 0.25-0.30mm (45°)

### Manutenção
- Troca de lâmina: quando corte fica irregular
- Limpeza da esteira: semanal
- Calibração: mensal
`
};

const systemPrompt = `Você é um Assistente Técnico especializado em técnicas de gravação e personalização industrial.

Seu papel é:
1. Responder dúvidas técnicas sobre máquinas e processos
2. Explicar passo a passo dos procedimentos
3. Sugerir insumos e materiais adequados
4. Diagnosticar problemas e sugerir soluções
5. Fornecer parâmetros de configuração

TÉCNICAS QUE VOCÊ DOMINA:
- Fiber Laser (Gravação a Laser Fibra)
- Laser CO2
- Laser UV
- Serigrafia Têxtil (Silk Screen)
- Serigrafia Vinílica/UV
- Tampografia
- Hot Stamping
- Prensa Térmica
- Sublimação
- Decalque para Forno
- DTF Têxtil
- DTF UV
- Corte de Mídia

DIRETRIZES:
- Seja objetivo e técnico
- Use terminologia profissional correta
- Quando não souber algo específico, seja honesto
- Sugira consultar o fabricante para casos muito específicos
- Priorize segurança do operador
- Inclua parâmetros numéricos quando relevante

FORMATO DE RESPOSTA:
- Use tópicos e listas quando apropriado
- Destaque valores numéricos importantes
- Organize em seções se a resposta for longa`;

// Detecta a técnica mencionada na mensagem
function detectTechnique(message: string): string[] {
  const techniques: string[] = [];
  const lowerMessage = message.toLowerCase();

  const keywords: Record<string, string[]> = {
    fiber_laser: ['fiber laser', 'laser fibra', 'fiber', 'gravação metal', 'marcação metal'],
    laser_co2: ['co2', 'laser co2', 'corte laser', 'acrílico', 'mdf', 'madeira'],
    laser_uv: ['laser uv', 'uv laser', 'ultravioleta'],
    silk_textil: ['serigrafia', 'silk', 'silk screen', 'tela', 'plastisol', 'carrossel', 'serigrafia têxtil', 'serigrafia textil'],
    silk_vinilico: ['silk uv', 'vinílico', 'vinilico', 'serigrafia uv'],
    tampografia: ['tampografia', 'tampão', 'tampao', 'clichê', 'cliche'],
    hot_stamping: ['hot stamping', 'stamping', 'foil', 'estampagem a quente'],
    prensa_termica: ['prensa', 'térmica', 'termica', 'transfer'],
    sublimacao: ['sublimação', 'sublimacao', 'sublimático', 'sublimatico', 'caneca'],
    decalque_forno: ['decalque', 'forno', 'cerâmica', 'ceramica', 'porcelana'],
    dtf_textil: ['dtf', 'direct to film', 'pó adesivo', 'po adesivo'],
    dtf_uv: ['dtf uv'],
    corte_midia: ['plotter', 'recorte', 'corte', 'vinil', 'adesivo']
  };

  for (const [technique, keywordList] of Object.entries(keywords)) {
    for (const keyword of keywordList) {
      if (lowerMessage.includes(keyword)) {
        if (!techniques.includes(technique)) {
          techniques.push(technique);
        }
        break;
      }
    }
  }

  return techniques;
}

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 8000;
const MAX_CUSTOM_KNOWLEDGE_CHARS = 20000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Every call fans out to a paid AI gateway request — require a real,
    // signed-in user so this can't be hit anonymously for unbounded cost.
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!authHeader || !supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => null);
    const { messages, customKnowledge } = body ?? {};

    // Validate the request body up front so malformed input returns 400, not 500.
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "'messages' must be a non-empty array" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }
    if (messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: `'messages' must contain at most ${MAX_MESSAGES} entries` }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }
    const oversizedMessage = messages.some(
      (m: any) => typeof m?.content === "string" && m.content.length > MAX_MESSAGE_CHARS
    );
    if (oversizedMessage) {
      return new Response(
        JSON.stringify({ error: `Each message must be at most ${MAX_MESSAGE_CHARS} characters` }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }
    if (typeof customKnowledge === "string" && customKnowledge.length > MAX_CUSTOM_KNOWLEDGE_CHARS) {
      return new Response(
        JSON.stringify({ error: `'customKnowledge' must be at most ${MAX_CUSTOM_KNOWLEDGE_CHARS} characters` }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Detectar técnica na última mensagem do usuário
    const lastUserMessage = messages.filter((m: any) => m && m.role === 'user').pop();
    const detectedTechniques = lastUserMessage && typeof lastUserMessage.content === 'string'
      ? detectTechnique(lastUserMessage.content)
      : [];

    // Montar conhecimento contextual
    let contextualKnowledge = "";
    if (detectedTechniques.length > 0) {
      contextualKnowledge = "\n\n## CONHECIMENTO TÉCNICO RELEVANTE:\n";
      for (const technique of detectedTechniques) {
        if (techniqueKnowledge[technique]) {
          contextualKnowledge += techniqueKnowledge[technique];
        }
      }
    }

    // Adicionar conhecimento customizado se fornecido
    if (customKnowledge) {
      contextualKnowledge += "\n\n## CONHECIMENTO ADICIONAL:\n" + customKnowledge;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(25_000),
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: systemPrompt + contextualKnowledge
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...getCorsHeaders(req), "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("technical-assistant error:", e instanceof Error ? e.message : String(e));
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
