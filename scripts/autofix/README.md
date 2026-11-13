# Correção local determinística

Origem: motores locais dos commits `e11bc583` e `f331b977`, usados pela instalação
existente e pela PR #148. Esta versão foi preparada separadamente a partir de main,
com autorização explícita para a sobreposição de arquivos. Nenhum motor chama IA.

- `npm run autofix`: simulação; gera `.autofix/relatorio.{json,md}`.
- `npm run autofix:apply`: cria branch própria antes da primeira escrita, valida e
  restaura os bytes originais dos arquivos propostos caso qualquer gate falhe.
- `node scripts/autofix/run.mjs --apply --commit --tests`: exige índice vazio, mede
  testes antes/depois e só então cria commit restrito aos próprios arquivos.
  Falhas restauram os arquivos e a branch original; nenhuma proposta remove a branch vazia.
  Uma proposta validada sem commit mantém a nova branch para revisão.
- `npm run autofix:test`: regressões isoladas em diretórios temporários.

Gates: projetos TypeScript app/node, ESLint dos arquivos alterados, baseline any,
relatório válido do ESLint; testes obrigatórios ao commitar. Erros de ferramenta,
relatórios vazios e regressão de testes impedem aceitar correções. Não há push.
Imports de valor, desestruturações, coerções e avaliações desconhecidas ficam na
fila manual: remoção de código não usado pode mudar efeitos observáveis.

Requer as dependências do lockfile e `.any-baseline.json` já instalado; não instala
pacotes nem redefine baselines. Os arquivos com alterações locais são ignorados.
