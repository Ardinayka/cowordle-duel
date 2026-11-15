# Lexivanto deployment

## Source baseline

The published ChatGPT Sites version is 46, built from `4b29122`. The first
commit on this branch imports that exact tree on top of GitHub commit
`bab2da4`. Both versions remain available in the branch history.

The published game includes ranked Duel, private Word Swap, friends, and the
latest mobile layout. GitHub's earlier room sync uses long polling and a
different database schema. Keep that experiment in Git history for separate
review. This branch uses the live game's room sync and migrations.

## Run locally

Use Node.js 24.22 or later from the Node 24 release line.

```sh
npm ci
npm run build
npm run dev
```

The preview server uses a local SQLite database. Changes to it are temporary.

## Cloudflare preview

The Cloudflare configuration targets the `lexivanto-preview` Worker and its
separate `lexivanto-preview` D1 database. For a new database, apply the SQL
files in `drizzle/meta/_journal.json` order before serving traffic. The preview
build uses guest play and opts out of search indexing.

The current preview is at
[lexivanto-preview.quinta-de-seves.workers.dev](https://lexivanto-preview.quinta-de-seves.workers.dev).

```sh
npm run build:cloudflare-preview
npm run deploy:cloudflare-preview
```

The build command runs deployment validation locally. The deploy command
requires Cloudflare credentials and deploys to the preview Worker.

In Cloudflare, open the preview Worker's **Settings → Builds** and connect the
shared GitHub repository. Configure `npm run build` as the build command and
`npx cf deploy --mode cloudflare-preview` as the deploy command. Point the
preview Worker at the review branch first. The Node version is recorded in
`.node-version`.

## Live site

The production build targets your Cloudflare Worker `lexivanto` at
[lexivanto.com](https://lexivanto.com). The Cloudflare configuration binds the
specific production D1 database and the existing public Google client ID.

The production Worker serves lexivanto.com directly. The existing accounts
and game history were migrated to the production database. Local publishing
requires deploy access in the Cloudflare account that owns the Worker.

### Publish an update

Edit the project in any editor. Install the pinned dependencies and sign in
to Cloudflare on your computer:

```sh
npm ci
npx cf auth login
```

Build a preview or validate the production build locally:

```sh
npm run deploy:cloudflare-preview
npm run build:cloudflare-production
```

Publish the reviewed production change:

```sh
npm run deploy:cloudflare-production
```

GitHub is optional. To deploy when changes merge into `main`, connect your
repository under the production Worker's **Settings → Builds**, set
`npm run build` as the build command and
`npx cf deploy --mode cloudflare-production` as the deploy command. Keep preview
deployments pointed at the preview Worker and database.

Apply any new schema migrations to the correct database before deploying code
that requires them. A Worker rollback restores code. Use a database recovery
point separately if you need to restore data.
