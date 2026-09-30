[<img alt="Spliit" height="60" src="https://github.com/spliit-app/spliit/blob/main/public/logo-with-text.png?raw=true" />](https://spliit.app)

Spliit is a free and open source alternative to Splitwise. You can either use the official instance at [Spliit.app](https://spliit.app), or deploy your own instance:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fspliit-app%2Fspliit&project-name=my-spliit-instance&repository-name=my-spliit-instance&stores=%5B%7B%22type%22%3A%22postgres%22%7D%5D&)

## Features

- [x] Create a group and share it with friends
- [x] Add expenses with one or more friends outside groups
- [x] Dashboard: who you owe and who owes you, across groups and friends
- [x] Create expenses with description
- [x] Display group balances
- [x] Create reimbursement expenses
- [x] Progressive Web App
- [x] Select all/no participant for expenses
- [x] Split expenses unevenly [(#6)](https://github.com/spliit-app/spliit/issues/6)
- [x] Mark a group as favorite [(#29)](https://github.com/spliit-app/spliit/issues/29)
- [x] Tell the application who you are when opening a group [(#7)](https://github.com/spliit-app/spliit/issues/7)
- [x] Assign a category to expenses [(#35)](https://github.com/spliit-app/spliit/issues/35)
- [x] Search for expenses in a group [(#51)](https://github.com/spliit-app/spliit/issues/51)
- [x] Upload and attach images to expenses [(#63)](https://github.com/spliit-app/spliit/issues/63)
- [x] Create expense by scanning a receipt [(#23)](https://github.com/spliit-app/spliit/issues/23)

### Possible incoming features

- [ ] Ability to create recurring expenses [(#5)](https://github.com/spliit-app/spliit/issues/5)
- [ ] Import expenses from Splitwise [(#22)](https://github.com/spliit-app/spliit/issues/22)

## Stack

- [Next.js](https://nextjs.org/) for the web application
- [TailwindCSS](https://tailwindcss.com/) for the styling
- [shadcn/UI](https://ui.shadcn.com/) for the UI components
- [Prisma](https://prisma.io) to access the database
- [Vercel](https://vercel.com/) for hosting (application and database)

## Contribute

The project is open to contributions. Feel free to open an issue or even a pull-request!
Join the discussion in [the Spliit Discord server](https://discord.gg/YSyVXbwvSY).

If you want to contribute financially and help us keep the application free and without ads, you can also:

- 💜 [Sponsor me (Sebastien)](https://github.com/sponsors/scastiel), or
- 💙 [Make a small one-time donation](https://donate.stripe.com/28o3eh96G7hH8k89Ba).

### Language

Split Karega is English-only (`messages/en-US.json`). Upstream Spliit's translations were removed because the new screens (accounts, groups membership, friends, Interac) exist only in English. To add a language back, add `messages/<locale>.json` and list the locale in `src/i18n/request.ts`.

## Run locally

1. Clone the repository (or fork it if you intend to contribute)
2. Start a PostgreSQL server. You can run `./scripts/start-local-db.sh` if you don’t have a server already.
3. Copy the file `.env.example` as `.env`, and set `JWT_SECRET` to a random string of at least 32 characters (e.g. `openssl rand -hex 32`)
4. Run `npm install` to install dependencies. This will also apply database migrations and update Prisma Client.
5. Run `npm run dev` to start the development server

## Run in a container

1. Run `npm run build-image` to build the docker image from the Dockerfile
2. Copy the file `container.env.example` as `container.env`, and set `JWT_SECRET` (see above)
3. Run `npm run start-container` to start the postgres and the spliit2 containers
4. You can access the app by browsing to http://localhost:3000

## Deploy on Vercel

1. Create a PostgreSQL database (e.g. Vercel → Storage → Prisma Postgres or Neon) and connect it to the project.
2. Set these environment variables for **both Production and Preview**:
   - `POSTGRES_URL`: the **direct** connection string (`postgres://…`), not a `prisma+postgres://` Accelerate URL
   - `JWT_SECRET`: a random string of at least 32 characters (e.g. `openssl rand -hex 32`)
3. Deploy. Installing dependencies runs `prisma migrate deploy`, so every build (previews included) applies pending migrations to the database it is configured with. Use a separate database for Preview so that unmerged branches can't migrate your production data.

The database must either be empty or have been created by `prisma migrate`. A database created with `prisma db push` has no migration history and `migrate deploy` will fail with `P3005`; reset it (`npx prisma migrate reset`, which deletes all data) or [baseline it](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining).

## Password reset emails

"Forgot password?" emails a one-time reset link (valid for 1 hour). Any SMTP server works; a free Gmail account (up to 500 emails a day) is enough for a friend group. Use a new Gmail account just for the app, so your personal address isn't the sender:

1. Create the Gmail account (e.g. `splitkarega.app@gmail.com`), turn on **2-Step Verification**, then create an **App password** (Google Account → Security → App passwords), e.g. named "Split Karega".
2. Set these environment variables (in Vercel: Settings → Environment Variables, for Production and Preview):
   - `SMTP_URL` (a secret): `smtps://splitkarega.app%40gmail.com:<app-password>@smtp.gmail.com:465` (write `@` in the address as `%40`, and remove the spaces from the app password)
   - `EMAIL_FROM` (optional): e.g. `Split Karega <splitkarega.app@gmail.com>`
   - `NEXT_PUBLIC_BASE_URL` (Production only): your site's address, e.g. `https://split-karega.vercel.app`, so links in emails point to it. Previews use their own address.
3. Redeploy.

Without `SMTP_URL`, the forgot password page says that reset by email isn't set up. In local development, the email is printed to the server console instead. Reset requests are limited to 5 per IP address per 15 minutes, and one email per account per minute.

## Notifications

Payments, new expenses, changes to expenses and being added to a group create notifications for the people involved who have an account (never for the person who made the change):

- **In the app:** the bell in the header shows the number of unread notifications; `/notifications` lists them.
- **By email:** a daily summary (at most one email a day, only when something happened). Each user picks the kinds of updates they get by email in their profile; all are on by default.

The summary is sent by a [Vercel Cron job](https://vercel.com/docs/cron-jobs) (`vercel.json`) calling `/api/cron/notifications` every day at 13:00 UTC (around 9 am Eastern), using the same email setup as password reset. To protect that endpoint:

1. Set `CRON_SECRET` in Vercel (Production, as a secret) to a random string of at least 32 characters, e.g. from `openssl rand -hex 32`. Vercel sends it with each cron request.
2. Redeploy. The job appears under Settings → Cron Jobs, where **Run** sends the summary right away.

Locally, without `CRON_SECRET`, open http://localhost:3000/api/cron/notifications to send the summaries.

## Backups

The [Database backup](.github/workflows/db-backup.yml) workflow runs every night: it dumps the database with `pg_dump`, encrypts the dump with a passphrase and keeps it as a workflow artifact for 30 days. Encryption matters because artifacts of a public repository can be downloaded by any GitHub user.

Setup (GitHub → repository **Settings** → **Secrets and variables** → **Actions** → **New repository secret**):

- `BACKUP_DATABASE_URL`: the direct `postgres://…` connection string (same as `POSTGRES_URL` in Vercel)
- `BACKUP_PASSPHRASE`: a long random passphrase. Store it in your password manager: without it the backups can't be read.

To take a backup right away, open **Actions** → **Database backup** → **Run workflow**. If a scheduled run fails, GitHub emails you.

To restore, download the artifact (a zip containing `backup.dump.gpg`) from the workflow run, then:

```bash
gpg --decrypt backup.dump.gpg > backup.dump   # asks for BACKUP_PASSPHRASE
pg_restore --clean --if-exists --no-owner --no-privileges -d "<postgres://… URL of the target database>" backup.dump
```

`pg_restore` replaces the tables in the target database with the backup's contents, so try it on an empty database first.

## Health check

The application has a health check endpoint that can be used to check if the application is running and if the database is accessible.

- `GET /api/health/readiness` or `GET /api/health` - Check if the application is ready to serve requests, including database connectivity.
- `GET /api/health/liveness` - Check if the application is running, but not necessarily ready to serve requests.

## Opt-in features

### Expense documents

Spliit offers users to upload images (to an AWS S3 bucket) and attach them to expenses. To enable this feature:

- Follow the instructions in the _S3 bucket_ and _IAM user_ sections of [next-s3-upload](https://next-s3-upload.codingvalue.com/setup#s3-bucket) to create and set up an S3 bucket where images will be stored.
- Update your environments variables with appropriate values:

```.env
NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS=true
S3_UPLOAD_KEY=AAAAAAAAAAAAAAAAAAAA
S3_UPLOAD_SECRET=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
S3_UPLOAD_BUCKET=name-of-s3-bucket
S3_UPLOAD_REGION=us-east-1
```

You can also use other S3 providers by providing a custom endpoint:

```.env
S3_UPLOAD_ENDPOINT=http://localhost:9000
```

### Create expense from receipt

You can offer users to create expense by uploading a receipt. This feature relies on [OpenAI GPT-4 with Vision](https://platform.openai.com/docs/guides/vision) and a public S3 storage endpoint.

To enable the feature:

- You must enable expense documents feature as well (see section above). That might change in the future, but for now we need to store images to make receipt scanning work.
- Subscribe to OpenAI API and get access to GPT 4 with Vision (you might need to buy credits in advance).
- Update your environment variables with appropriate values:

```.env
NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT=true
OPENAI_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Deduce category from title

You can offer users to automatically deduce the expense category from the title. Since this feature relies on a OpenAI subscription, follow the signup instructions above and configure the following environment variables:

```.env
NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT=true
OPENAI_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## License

MIT, see [LICENSE](./LICENSE).
