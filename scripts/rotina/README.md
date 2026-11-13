# Rotina diária local

Origem: rotina e auditoria locais do commit `f331b977`. Executa auditoria e correção
em worktree temporária de origin/main; produz relatórios em
`~/relatorios/fast-gravacoes-v2`. A auditoria é estática, sem IA ou API de modelo.

`bash scripts/rotina/instalar.sh` copia versões estáveis para
`~/.local/share/fast-gravacoes-rotina` e instala o timer de usuário das 08:15.
Instalar somente após validar os motores. O instalador não roda a correção. O serviço grava `FG_REPO` com a raiz do clone
escolhido na instalação; a rotina respeita esse caminho, inclusive fora de `~/projetos`.

Falha de dependência, audit, autofix ou testes retorna código não zero ao systemd.
Máquina ocupada ou branch automática pendente são execução pulada com motivo.
A rotina não publica branches; uma branch pendente impede novas correções.
Os instaladores de rotina e sync usam a mesma trava em `~/.cache`, para não disputar
refs/worktrees. O WSL e o gerenciador systemd de usuário precisam estar ativos.
