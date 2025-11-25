# Recomendador de Jogos 

## O que tem aqui
- backend/ (Node + Express)
- frontend/ (HTML, CSS, JS)
- db.json (banco local em JSON)

## Como rodar (local)

1. Backend (desenvolvimento)
   ```powershell
   npm install
   npm start
   ```
   O servidor irá rodar em http://localhost:3000

2. Rodando via Docker Compose (recomendado — levanta app + Postgres seedado)
   ```powershell
   docker compose up --build
   ```

3. Se você puxar apenas a imagem do app do Docker Hub, o container do app não contém o Postgres embutido. Exemplos para rodar manualmente:

   a) Criar uma network e subir um Postgres com volume:
   ```powershell
   docker network create nextgame_net
   docker run -d --name nextgame-postgres --network nextgame_net -e POSTGRES_DB=meu_banco_docker -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -v nextgame_pgdata:/var/lib/postgresql/data postgres:15-alpine
   ```

   b) Rodar a imagem do app (substitua `mayconh/nextgame:1.0` pelo seu tag):
   ```powershell
   docker run -d --name nextgame-app --network nextgame_net -p 3000:3000 -e DB_HOST=nextgame-postgres -e DB_PORT=5432 -e POSTGRES_DB=meu_banco_docker -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres mayconh/nextgame:1.0
   ```

   Observação: o script SQL de inicialização em `docker/postgres/init.sql` será executado automaticamente apenas na primeira inicialização do volume do Postgres. Se quiser reaplicar, remova o volume (`docker compose down --volumes` ou `docker volume rm nextgame_pgdata`) antes de levantar novamente.



