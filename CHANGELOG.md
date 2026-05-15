# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-05-15

### Changed
- Switched Prisma database provider from `postgresql` to `sqlite` for easier local development without Docker.
- Removed PostgreSQL-specific database annotations (`@db.Text`, `@db.Date`) from `prisma/schema.prisma`.
- Cleared the `prisma/migrations` folder to remove previous PostgreSQL-specific migrations.

### Added
- Initialized local SQLite database (`dev.db`) using `npx prisma db push`.
- Set up local development environment and started the application via `npm run dev`.
