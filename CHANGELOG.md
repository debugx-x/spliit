# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- User accounts: register, login (session cookie signed with `JWT_SECRET`), and profile editing (display name, email, default currency).
- Groups record their creator, and participants can be linked to user accounts (`add_user_profiles` migration).
- Joining a group through its link: logged-in users pick their participant name (or add themselves) to become a member.
- "My groups" lists the groups you created or joined, from your account, on any device. Starred and archived groups are saved to your account.
- Nightly encrypted database backups (see README "Backups").
- Friends view (/friends): what each friend owes you, or you owe them, across all your groups, per currency, with a per-group breakdown. "My groups" shows your overall totals.
- Settle up with Interac: "Pay with Interac" on your own suggested reimbursements shows the friend's Interac email, the amount and a message to copy into your bank app, then records the payment in one tap. Each user has an editable "Interac e-Transfer email" in their profile (starting as their account email); it's the only email other members see.
- "Forgot password?": a one-time reset link (valid 1 hour) sent by email through any SMTP server, e.g. a Gmail account (see README "Password reset emails"). Reset requests are limited to 5 per IP address per 15 minutes, and a reset clears the account's failed-login lockout.
- Notifications: payments, new expenses, changes and being added to a group show up under a bell in the header (/notifications), and in a daily email summary. Each user chooses in their profile which kinds of updates they get by email (see README "Notifications").
- Expenses with friends outside groups: "Add expense" on the Friends page and dashboard, with one or more friends. Each set of friends gets a hidden group (you + Alex, you + Alex & Sam), so balances, settling up, notifications and exports work as in groups. These don't appear in "My groups", can't be joined by link, and only their currency can be changed.
- Dashboard: logged-in users land on a Splitwise-style dashboard with totals, "You owe" and "You are owed", their groups, recent activity, and quick "Add an expense" and "Settle up".

### Changed

- Previews use their own database, separate from production. The throwaway accounts and groups created while testing were removed from production before launch (with an encrypted backup taken first), and the one-off cleanup workflow was removed.
- After logging in, signing up or resetting a password (without a page to return to), you land on the dashboard instead of "My groups".
- Renamed the app to **Split Karega** (page titles, installed app name, share and export texts, homepage).
- New Split Karega logo pack: a coin split in two, on green. SVG masters in `public/brand/`; `npm run generate-logos` renders the favicon, app icons (including maskable and Apple touch icon), header logo, iOS splash and social banner from them.
- Creating or editing groups and expenses requires being logged in; logged-out users are redirected to the login page and brought back afterwards.
- The database connection is configured with a single `POSTGRES_URL` variable (replacing `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`).
- `JWT_SECRET` (at least 32 characters) is now a required environment variable.
- Groups are members-only: their expenses, balances, stats, activity and exports are only available to members. Other users (and unknown group IDs) get "not found".
- Participants are no longer linked to accounts by matching names; users link themselves by joining.

- The app is English-only: the other 22 languages (and browser-based language detection) were removed, since the new screens only exist in English.
- Login rate limiting: 5 failed logins per account, or 20 per IP address, within 15 minutes block further attempts until the window passes.

### Fixed

- The profile page sent the user's password hash to the browser.
- Expenses could be read, updated or deleted through another group's ID.
