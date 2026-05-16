# Tasks: User Profiles and Authentication

**Input**: Design documents from `/specs/001-user-profiles/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `src/app/`, `src/lib/`, `prisma/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database migration setup

- [ ] T001 Verify SQLite/Prisma environment is active and running

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Update `prisma/schema.prisma` with `User` model, and modifications to `Group` and `Participant`.
- [ ] T003 Generate and run the Prisma migration.
- [ ] T004 Implement session and authentication utilities in `src/lib/auth.ts`.

**Checkpoint**: Foundation ready - database ready and session utility available.

---

## Phase 3: User Story 1 - Account Creation (Priority: P1) 🎯 MVP

**Goal**: As a new user, I want to create an account using my basic information so that I can have a profile in the app.

**Independent Test**: Can be fully tested by navigating to the signup flow, entering details, and seeing a successful profile creation confirmation.

### Implementation for User Story 1

- [ ] T005 [US1] Create the `/register` UI component in `src/app/(auth)/register/page.tsx`
- [ ] T006 [US1] Implement registration server action (handle password hashing via bcryptjs, create User).

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - User Login (Priority: P1)

**Goal**: As an existing user, I want to log in using my credentials so that I can access my account.

**Independent Test**: Can be fully tested by entering valid credentials of an existing account and verifying successful authentication, as well as entering invalid credentials and verifying failure.

### Implementation for User Story 2

- [ ] T007 [US2] Create the `/login` UI component in `src/app/(auth)/login/page.tsx`
- [ ] T008 [US2] Implement login server action (verify password, set session cookie).
- [ ] T009 [US2] Update root layout or middleware to protect standard routes or show logged-in state.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Edit Profile (Priority: P2)

**Goal**: As a logged-in user, I want to edit my profile information so that I can keep my details up to date.

**Independent Test**: Can be fully tested by logging in, navigating to the profile edit screen, changing information, and saving it to see the changes applied.

### Implementation for User Story 3

- [ ] T010 [P] [US3] Create the `/profile` UI component in `src/app/profile/page.tsx`
- [ ] T011 [US3] Implement profile update server action (updates Display Name, Email, Default Currency).

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Group Creation & Participant Selection (Priority: P2)

**Goal**: As a logged-in user, I want to create a group and add other registered users as participants.

**Independent Test**: Can be fully tested by creating a new group, searching for existing users by UniqueID or Display Name, selecting them, and verifying the group is created with those participants.

### Implementation for User Story 4

- [ ] T012 [P] [US4] Modify group creation component (e.g. `src/app/groups/new/page.tsx`) to link creator to the authenticated user.
- [ ] T013 [US4] Implement user search endpoint/action by UniqueID/DisplayName.
- [ ] T014 [US4] Modify participant addition logic to optionally link the `userId`.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T015 Polish UI and ensure Tailwind styles match Spliit aesthetic.
- [ ] T016 Test end-to-end functionality of user login -> creating a group.

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Stories (Phase 3+)**: All depend on Foundational phase completion

## Implementation Strategy

### MVP First (User Story 1 & 2)

1. Complete Phase 1 & 2
2. Complete Phase 3 & 4 (Auth & Login)
3. Validate session handling works across the app.
4. Complete Phase 5 (Profile)
5. Complete Phase 6 (Groups)
