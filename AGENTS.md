# Split Karega: notes for AI coding agents

Split Karega is a free Splitwise alternative for a friend group, forked from
[Spliit](https://github.com/spliit-app/spliit). See README.md for features,
setup and deployment, and CHANGELOG.md for what changed from upstream.

## Stack

- Next.js 16 (App Router), React 19, tRPC v11, TanStack Query
- Prisma 6 on PostgreSQL (`POSTGRES_URL`)
- Tailwind CSS with shadcn/ui components (`src/components/ui`)
- next-intl, English only (`messages/en-US.json`)
- Hosted on Vercel (Hobby), with a daily Vercel Cron job (`vercel.json`)

## Commands

```bash
npm run dev               # http://localhost:3000
npm run check-types       # TypeScript
npm run lint              # ESLint (eslint.config.mjs)
npm run check-formatting  # Prettier; `npm run prettier` to fix
npm test                  # Jest
npx prisma migrate dev --name <change>  # after editing prisma/schema.prisma
```

CI (`.github/workflows/ci.yml`) runs the first four checks on every pull
request. Run them before pushing.

## Where things are

- `src/app`: pages and API routes (`api/cron/notifications` is the daily
  summary)
- `src/trpc/routers`: the API. Use `authedProcedure` for logged-in users and
  `memberProcedure` for anything inside a group (`src/trpc/init.ts`)
- `src/lib`: logic shared by the routers and pages (auth, membership,
  balances, friend sets, notifications, email). Unit tests live next to it as
  `*.test.ts`
- `src/components`: shared components. `src/components/ui` is shadcn/ui and
  is excluded from Prettier
- `prisma/`: schema and migrations. Every deploy runs `prisma migrate deploy`

## Conventions

- **Groups are members-only.** Check membership on the server for anything
  that reads or changes a group.
- **Expenses with friends outside groups** are hidden groups with
  `kind = FRIEND_SET`. They never show in "My groups" or open by link.
- **User-facing text** goes in `messages/en-US.json`, not in components.
- **Colours** come from the theme tokens in `src/app/globals.css` (`primary`,
  `marigold`, `owe`, `owed`, `hero`...), never hard-coded Tailwind colours.
  Text/background pairs must pass WCAG AA in light and dark.
- **Changes users would notice** get a line in CHANGELOG.md under
  "Unreleased", and a README update if they change setup or features.
