# Espelho local do GitHub

Origem: script já instalado em `~/.local/share/fast-gravacoes-sync/sincronizar.sh`.
A fonte é versionada aqui para poder revisar correções antes de reinstalar.

`bash scripts/sync/instalar.sh` instala o timer de usuário horário com a mesma trava
Git da rotina diária. Sem IA; faz fetch do remoto configurado, nunca push.

O espelho pula branches com qualquer alteração, incluindo arquivos não rastreados,
merge em andamento ou checkout em outra worktree. Usa `reset --keep` para recusar
sobrescrita mesmo se um arquivo surgir depois da checagem. Commits locais divergentes
continuam preservados em refs/backup/sync por 30 dias antes de igualar ao upstream.
Falha de fetch retorna erro ao systemd. Nenhuma credencial é escrita pelo instalador.
