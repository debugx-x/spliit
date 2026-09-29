# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- User accounts: register, login (session cookie signed with `JWT_SECRET`), and profile editing (display name, email, default currency).
- Groups record their creator, and participants can be linked to user accounts (`add_user_profiles` migration).

### Changed
- Creating or editing groups and expenses requires being logged in; logged-out users are redirected to the login page and brought back afterwards.
- The database connection is configured with a single `POSTGRES_URL` variable (replacing `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`).
- `JWT_SECRET` (at least 32 characters) is now a required environment variable.
