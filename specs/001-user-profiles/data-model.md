# Data Model & Contracts

## Entity: User

- **id**: `String` (UUID, Primary Key)
- **uniqueId**: `String` (Unique constraint)
- **displayName**: `String`
- **email**: `String` (Unique constraint)
- **passwordHash**: `String`
- **defaultCurrency**: `String` (Default: "CAD")
- **createdAt**: `DateTime` (Default: now())

**Relationships:**
- `createdGroups`: 1-to-many with `Group` (as `creator`)
- `participations`: 1-to-many with `Participant` (as `user`)

## Entity Modifications

### Group
- **Added**: `creatorId` (String, nullable) - Foreign key to `User.id`

### Participant
- **Added**: `userId` (String, nullable) - Foreign key to `User.id`

## Validation Rules
- `uniqueId` and `email` must be unique globally.
- Passwords must be hashed using `bcrypt` (salt rounds: 10) before storing.
- Groups created by authenticated users must capture the `userId` in `creatorId`.
- Unauthenticated users cannot create groups.

## Contracts / API

- `POST /register`: Handled via Next.js Server Action `registerAction`. Expects `displayName`, `uniqueId`, `email`, `password`.
- `POST /login`: Handled via Next.js Server Action `loginAction`. Expects `email`, `password`.
- `POST /profile`: Handled via Next.js Server Action `updateProfileAction`.
- `trpc.groups.create`: Expects `groupFormValues`, extracts `creatorId` from server context.
