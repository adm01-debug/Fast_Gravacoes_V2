# Auditoria de qualidade — resumo para o dono

**Data:** 23/11/2026 · **Versão auditada:** commit `ca42441b` da `main` · **Nada foi alterado no sistema nesta auditoria.**

## Estado geral, em três frases

O sistema está bem construído na maior parte: o controle de acesso ao banco é sério (327 regras de permissão, só uma delas frouxa), a estrutura de código é organizada e o portão de qualidade do repositório existe e funciona. **Mas três coisas estão paradas ao mesmo tempo: o envio de correções para o sistema em produção, a mudança de situação de uma ordem de serviço, e a recuperação de senha.** Ou seja: hoje a fábrica não consegue tocar uma OS pelo sistema, quem esquece a senha não volta a entrar, e nenhuma correção que você aprovar chega ao ar enquanto o primeiro problema não for resolvido.

## Os dez maiores riscos, em linguagem de negócio

1. **Nada que você aprovar chega ao sistema.** A publicação de mudanças de banco e de servidor falhou nas últimas quatro tentativas (22/11, das 15h44 às 19h36) porque alguém aplicou uma alteração de banco direto em produção, fora do caminho normal. Enquanto isso não for desfeito, qualquer correção aprovada fica só no repositório. *(etapas 001–003)*
2. **Ninguém consegue mudar a situação de uma ordem de serviço.** Um registro automático de auditoria tenta gravar em duas colunas que não existem mais, e por isso iniciar, pausar, concluir, retrabalhar ou cancelar uma OS falha no banco. Isso também trava a promoção automática da fila e a criação da tarefa de embalagem. A correção existe, está pronta numa proposta aberta e depende do item 1. *(etapas 004, 256)*
3. **Quem esquece a senha não volta a entrar.** São quatro defeitos somados: o endereço que o sistema envia nos e-mails aponta para um endereço protegido por login da Vercel (testado: pede login da Vercel, não do seu sistema); o endereço que funciona não está na lista autorizada; o aplicativo não informa para onde o link deve voltar; e o endereço usado pelo servidor (`fastgravacoes.com.br`) **não responde**. Nem a aprovação do gestor resolve. *(etapas 005–007, 255)*
4. **Nenhum e-mail do sistema sai, e o sistema diz que saiu.** A chave do serviço de e-mail não está configurada no projeto. Alertas de manutenção, resumo diário, aviso de risco de perda e aviso de rotina falhando **não chegam a ninguém** — e o painel registra "e-mail de alerta enviado". Além disso, não há servidor de e-mail próprio e o limite é de 2 e-mails por hora para o projeto inteiro. *(etapas 008, 013–016)*
5. **Um gerente pode se transformar em administrador.** Existe uma função de servidor que permite gravar direto na tabela de papéis (e na trilha de auditoria) sem passar pelas regras de permissão, liberada para quem tem papel de gerente. Ninguém no sistema a usa — ela está publicada e aberta. *(etapas 056, 057)*
6. **Qualquer pessoa na internet pode bloquear a conta de um operador.** O registro de "errei a senha" pode ser disparado de fora do sistema, com a chave pública que vai no site, até a conta travar. O bloqueio por tentativa, por endereço e por região também é decidido **no navegador** — quem chamar o serviço de login diretamente passa por fora de todos eles. *(etapas 058, 231)*
7. **É possível apagar uma ordem de serviço com produção registrada — e o histórico vai junto.** A regra que proíbe isso está escrita na documentação e não existe em nenhuma camada executável. A exclusão arrasta expedição, perdas de produção, trilha de auditoria e tarefas de embalagem, por configuração do banco. *(etapas 036–040)*
8. **O sistema não atualiza sozinho: 26 das 27 telas que deveriam receber mudanças em tempo real não recebem nada.** A publicação de mudanças do banco foi zerada em algum momento e sobraram duas tabelas. Dois operadores no mesmo pedido podem ver estados diferentes até alguém recarregar a página. *(etapas 041–043, 298)*
9. **Dez painéis mostram números inventados no código como se fossem reais** — entre eles a eficiência do quiosque de fábrica (94,2% fixo), o "OEE 92,4%" do gêmeo digital quando não há dado nenhum, a projeção de prazo da inteligência de negócio (calculada com duas constantes imaginadas), a eficiência de 95% que vai para a planilha exportada, e um painel de segurança que aprova três verificações sem verificar nada. *(etapas 066–076, 257)*
10. **A proteção dos seus dados é menor do que parece.** A recuperação a um ponto no tempo está desligada (perde-se até um dia em caso de incidente), a rotina de backup própria grava numa tabela que não existe, e 91% do banco (1,0 GB de 1,1 GB) é uma tabela de registro de erros com 2,3 milhões de linhas — que, por um detalhe de permissão, **nenhuma tela consegue ler**. *(etapas 026, 027–029, 103, 116)*

## Contagem

| severidade | achados | o que significa |
|---|---|---|
| **Crítica** | 10 | perda ou vazamento de dado, falha de segurança, fluxo principal quebrado |
| **Alta** | 66 | função importante falha ou dá resultado errado |
| **Média** | 55 | funciona com defeito ou fragilidade |
| **Baixa** | 18 | acabamento e organização |
| **Total** | **149** | |

Foram rastreados **63 cenários** de ponta a ponta em 8 jornadas (do primeiro clique até o dado gravado), cruzando ator, estado do dado, tipo de entrada e condição (duas abas, rede caindo, sessão expirada, borda de horário). Em **54** deles o resultado encontrado difere do esperado — é de onde vêm os achados. Onze cenários foram comprovados por execução real (navegação ao vivo no site, consulta por comando ao retrato do banco, e a execução da verificação automática do repositório); os demais foram rastreados pelo código, e isso está marcado cenário por cenário em `02-CENARIOS.md`.

Vinte desses achados foram encontrados **duas vezes**, por auditores independentes — o que aumenta a confiança neles (lista no fim de `03-ACHADOS.md`).

O plano de correção tem **300 etapas**, cada uma do tamanho de uma proposta pequena e verificável sozinha, ordenadas em oito ondas (segurança primeiro, acabamento por último). **129 delas precisam da sua aprovação** antes de ir ao ar, porque mexem em banco de produção, publicação, segredos, custo ou decisão de negócio. As doze primeiras estão listadas no começo de `04-PLANO.md` e são as que destravam todo o resto.

## O que esta auditoria não conseguiu verificar

1. **Não foi possível rodar os testes, o verificador de tipos nem o build neste ambiente**: a instalação de dependências falha porque parte dos pacotes vem de um repositório privado que a rede desta sessão bloqueia. Em substituição, foi usada a execução real da verificação automática do seu repositório no commit auditado — que estava **verde** (incluindo testes de unidade, de integração e de regras de acesso).
2. **Não foi possível consultar o banco de produção diretamente**: nenhuma das conexões de banco disponíveis nesta sessão aponta para o seu projeto. Todo o exame do banco foi feito sobre o retrato automático que o próprio sistema publica a cada 10 minutos (tabelas, permissões, funções com o código, gatilhos, rotinas, índices e estatísticas). Por isso, duas coisas ficaram sem medição: **a origem exata** dos 2,3 milhões de registros de erro (há uma etapa de diagnóstico para isso, a 027) e a contagem exata de algumas tabelas.
3. **Nenhuma tela interna foi aberta com login**: a auditoria foi somente leitura, e entrar no sistema criaria sessão e registros. As telas internas foram verificadas lendo o código; o que foi aberto ao vivo, sem login, foi a tela de entrada, a de rastreamento público e a de componentes (esta última, indevidamente pública — item do plano 011).
4. **Não foi possível ler as configurações do painel da Vercel** (variáveis de ambiente, domínios, histórico de publicação): a credencial desta sessão não alcança o projeto — ele existe no time `juca1`, mas a consulta responde "não encontrado". Isso significa que **não foi possível conferir se as variáveis que o site precisa estão configuradas lá**; é uma verificação que vale fazer com acesso ao painel.
5. **Nenhum e-mail, notificação ou integração foi disparado**: tudo o que se afirma sobre e-mail e sobre o CRM vem de leitura de código e de configuração.

## Onde está cada coisa

| arquivo | conteúdo |
|---|---|
| `docs/qa/00-RESUMO.md` | este documento |
| `docs/qa/01-INVENTARIO.md` | o mapa do sistema e o registro do que foi e não foi coberto |
| `docs/qa/02-CENARIOS.md` | os cenários testados por jornada, com o que se esperava e o que se encontrou |
| `docs/qa/03-ACHADOS.md` | os 149 achados, com evidência, agrupados por causa |
| `docs/qa/04-PLANO.md` | as 300 etapas de correção, em ordem, para o agente executor |
| `docs/qa/05-PROGRESSO.md` | a lista de acompanhamento que o executor vai marcando |
