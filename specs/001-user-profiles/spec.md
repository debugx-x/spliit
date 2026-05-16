# Feature Specification: User Profiles and Authentication

**Feature Branch**: `001-user-profiles`

**Created**: 2026-05-15

**Status**: Draft

**Input**: User description: "I want to allow user to be able to create Profiles for themselves and edit them if required. Basic Profile Info - UserName - UniqueID - Password - Email for (Interac) Allow users to login to access their accounts, if they don't have one let then create an account quickly. Add options on the home to let users login"

## Clarifications

### Session 2026-05-15
- Q: How should the creator identify and select the registered users they want to add to the group? → A: Searchable list (UniqueID or Display Name)
- Q: Do registered users need to accept an invitation to join a group, or are they added automatically by the creator? → A: Added automatically without requiring consent
- Q: After a group is created, can participants be removed by the creator, or can participants leave on their own? → A: Both (creator can remove, participants can leave)
- Custom Addition: Added Display Name and Default Currency (default to CAD) to the profile.
- Q: Should Display Name and UserName be the same thing? → A: Yes, consolidated into a single 'Display Name' field.
- Q: Can unauthenticated users create groups? → A: No, users must be logged in to create a group.
- Q: If a user receives a direct link to a group but is not logged in, what access do they have? → A: Public (Read-only): Anyone with the link can view the group, but cannot add/edit.
- Q: When a logged-in user creates a new group, should the group's default currency automatically be set to the user's profile "Default Currency" preference? → A: Profile Default: The group's currency automatically defaults to the creator's profile "Default Currency".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Account Creation (Priority: P1)

As a new user, I want to create an account using my basic information so that I can have a profile in the app.

**Why this priority**: Without account creation, new users cannot onboard onto the app. It is the most critical step for user acquisition.

**Independent Test**: Can be fully tested by navigating to the signup flow, entering details, and seeing a successful profile creation confirmation.

**Acceptance Scenarios**:

1. **Given** I am a new user on the home page, **When** I choose to create an account and provide a valid Display Name, UniqueID, Password, and Email, **Then** my profile is created and I am granted access.
2. **Given** I am creating an account, **When** I provide a UniqueID or Email that is already taken, **Then** I am shown an error message and prompted to use different credentials.

---

### User Story 2 - User Login (Priority: P1)

As an existing user, I want to log in using my credentials so that I can access my account.

**Why this priority**: Existing users must be able to return to the app and access their specific data and profile.

**Independent Test**: Can be fully tested by entering valid credentials of an existing account and verifying successful authentication, as well as entering invalid credentials and verifying failure.

**Acceptance Scenarios**:

1. **Given** I have an existing account, **When** I enter my correct credentials on the login page, **Then** I am authenticated and directed to the app.
2. **Given** I have an existing account, **When** I enter an incorrect password, **Then** I am denied access and shown an error message.

---

### User Story 3 - Edit Profile (Priority: P2)

As a logged-in user, I want to edit my profile information so that I can keep my details up to date.

**Why this priority**: Users need the flexibility to change their Display Name, Password, or Email over time, but it is secondary to the initial onboarding.

**Independent Test**: Can be fully tested by logging in, navigating to the profile edit screen, changing information, and saving it to see the changes applied.

**Acceptance Scenarios**:

1. **Given** I am logged into my account, **When** I update my Display Name, Email, or Default Currency and save, **Then** the new information is permanently stored on my profile.
2. **Given** I am editing my profile, **When** I attempt to change my Email to one already in use, **Then** I am shown an error preventing the change.

---

### User Story 4 - Group Creation & Participant Selection (Priority: P2)

As a logged-in user, I want to create a group and add other registered users as participants so that we can interact within that group.

**Why this priority**: Groups form the basis of interaction between users in the app.

**Independent Test**: Can be fully tested by creating a new group, searching for existing users by UniqueID or Display Name, selecting them, and verifying the group is created with those participants.

**Acceptance Scenarios**:

1. **Given** I am a logged-in user, **When** I choose to create a group and search for users by their UniqueID or Display Name, **Then** I see a list of matching users and can add them to my group.
2. **Given** I am adding participants, **When** I select users and save the group, **Then** the group is created and users are automatically added as participants without requiring an invitation or consent.

### Edge Cases

- What happens when a user leaves mandatory fields (Display Name, UniqueID, Password, Email) blank during signup?
- How does the system handle concurrent signups with the exact same UniqueID?
- What happens if the user enters an invalid email format (e.g., missing '@')?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create an account by providing a Display Name, UniqueID, Password, and Email.
- **FR-002**: System MUST display prominent login and signup options on the home page.
- **FR-003**: System MUST enforce that UniqueID and Email are unique across all user accounts in the system.
- **FR-004**: System MUST allow users to log in with their credentials (UniqueID/Email and Password).
- **FR-005**: System MUST allow logged-in users to edit and save their profile information, including their Default Currency.
- **FR-006**: System MUST authenticate user sessions securely with a 30-day persistent session.
- **FR-007**: System MUST NOT support automated password reset for the MVP (manual admin intervention is required for forgotten passwords).
- **FR-008**: System MUST allow logged-in users to create a group and become its creator.
- **FR-009**: System MUST allow group creators to add other registered users as participants by searching a list via UniqueID or Display Name.
- **FR-010**: System MUST allow group creators to remove participants and allow participants to voluntarily leave groups.
- FR-011: System MUST default a user's currency preference to CAD.
- FR-012: System MUST prevent unauthenticated users from creating groups.
- FR-013: System MUST allow unauthenticated users to view groups in read-only mode via a shareable link (they cannot add or edit expenses).
- FR-014: System MUST automatically default the group's currency to the creator's profile "Default Currency" preference during group creation.

### Key Entities

- **User Profile**: Represents a registered user. Key attributes include Display Name, UniqueID, Password (stored securely), Email, and Default Currency (defaults to CAD).
- **Group**: Represents a collection of users. Key attributes include Name, Creator (a User Profile), and Participants (a list of User Profiles).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the account creation process in under 2 minutes.
- **SC-002**: 95% of users can successfully log in on their first attempt with the correct credentials.
- **SC-003**: The system successfully prevents duplicate accounts based on UniqueID or Email 100% of the time.
- **SC-004**: Changes to a user's profile are saved and reflected in the UI in under 1 second.

## Assumptions

- Email verification via magic link/OTP is not strictly required for the MVP account creation flow, given this is an exclusive app for a friend group.
- The "Email for (Interac)" implies the email needs to be structurally valid for standard email communications, as it may be used for e-transfers later.
- Standard web session management will be utilized.
- Passwords will be securely hashed before being stored in the database.
