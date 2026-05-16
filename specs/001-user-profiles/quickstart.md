# Quickstart: User Profiles

## Local Development
1. Start the SQLite database and application:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000/register`.
3. Create an account with a unique Email and UniqueID.
4. Try creating a new group at `http://localhost:3000/groups/create` to verify your creator linkage.

## Dependencies
- Ensure your `.env` contains `JWT_SECRET=your_super_secret_key_here` for session encryption.
