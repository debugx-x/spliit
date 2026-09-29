# Quickstart: User Profiles

## Local Development
1. Start a PostgreSQL server (e.g. `./scripts/start-local-db.sh`).
2. Copy `.env.example` to `.env`, and set `JWT_SECRET` to a random string of
   at least 32 characters (`openssl rand -hex 32`). It signs session cookies.
3. Install dependencies and apply migrations, then start the app:
   ```bash
   npm install
   npm run dev
   ```
4. Navigate to `http://localhost:3000/register`.
5. Create an account with a unique Email and UniqueID.
6. Try creating a new group at `http://localhost:3000/groups/create` to verify your creator linkage.
