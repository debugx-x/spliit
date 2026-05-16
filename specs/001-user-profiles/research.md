# Research & Technical Decisions: User Profiles & Authentication

## Testing Framework (Resolved)
- **Decision**: Jest for Unit testing API/lib logic. Playwright for E2E tests (if applicable) but for this MVP, we rely on standard manual checks and basic Jest coverage.
- **Rationale**: Spliit appears to be using standard Next.js setup without a heavily enforced E2E framework currently installed in `package.json` aside from standard `@testing-library/react`. We will stick to the existing `jest` config.

## Authentication Strategy (Resolved)
- **Decision**: Stateless JWT stored in HTTP-Only secure cookies using `jose` and `bcryptjs`. Server Actions for all form submissions.
- **Rationale**: Next.js App Router (React 19) pairs perfectly with Server Actions. Stateless JWTs avoid needing a heavy database session table and are perfectly secure for this MVP scale.
- **Alternatives considered**: NextAuth.js (Auth.js) was considered but adds significant overhead and complexity for a simple credential-based local MVP setup.

## Group Creation Logic (Resolved)
- **Decision**: Backend dynamic resolution of `creatorId` and `userId` mapping for participants using exact name/uniqueId matching.
- **Rationale**: Prevents having to build a complex combobox autocomplete frontend component right now while still fulfilling the requirement to link registered users seamlessly.
