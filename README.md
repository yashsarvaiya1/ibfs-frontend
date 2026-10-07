# IBFS frontend

IBFS is a billing, inventory and simplified accounting workspace for desktop browsers and mobile. This repository is the Next.js frontend; keep the Django repository beside it as `../backend`.

The daily flow stays quotation → PO → bill or quotation → PI → invoice. Bills/invoices establish obligations; payments settle them. When challans are enabled, they own stock movement. Automation is optional. Reports and offline drafts do not post accounting entries.

## Local development

Use Node **24**, npm and the committed lockfile. The application currently pins Next.js 16.3.8 and React 19.3.0.

```sh
npm ci
```

Create private `.env.local` with `DJANGO_ORIGIN=http://127.0.0.1:8000`, start the backend using its README, then run:

```sh
npm run dev -- --port 4000
```

Open `http://localhost:4000`. Set the backend trusted CSRF origin to that exact browser origin. Browser requests use authenticated `/api` and `/media` proxies; do not add a public backend URL or expose credentials to client code.

```sh
npm run typecheck
npm run check:lint-dependencies
npm run build
npm audit
```

`npm run lint -- <paths>` runs focused lint checks. Older modules retain lint debt; a successful production build does not imply the entire repository passes lint. The private `tools/next-glob` adapter removes an unpatched dependency chain and supports only the pinned Next ESLint plugin's directory lookup; verify that contract when upgrading Next.

## Hosting on your VM

Keep the existing Docker Compose and private `.env` method. Copy `.env.example` only for a new installation; merge any new settings into an existing VM environment. Preserve the Compose project name and existing PostgreSQL 15/media volumes. Build contexts expect these sibling repositories.

```sh
docker compose config --quiet
docker compose build
docker compose up -d
```

Before updating a live installation, follow the backend [release, backup and restore instructions](../backend/docs/DEPLOYMENT.md). Containers validate settings, migrate the database, create the shared cache table and expose health checks. This development work does not deploy to your VM or rotate its credentials.

## Workspace features

- Classic and Modern backend PDF layouts; repeated page sections and blank totals/words spaces until each document's final page.
- WhatsApp text preparation with manual attachment of the downloaded PDF.
- Monthly/custom-range CA packs with document exclusions, combined into one PDF.
- FY/month/custom GST book reports, optional per-item rates/classifications, HSN summaries, CSV/PDF exports and manual CSV comparisons.
- Optional document version history and allocation review; the existing accounting flow remains intact.
- Installable desktop/mobile PWA with explicitly saved, encrypted PDFs and local drafts at `/offline`.

Offline access needs a separate vault password. Save files while online, then unlock locally when offline. The password/key is not stored; there is no password recovery. Logout clears local copies. Drafts return to the normal online form for validation and posting; offline edits never change balances, payments or stock. Browser storage can be evicted, so retain important downloads separately.

See [reports and comparisons](../backend/docs/REPORTS.md), [PDF layout](../backend/docs/PDF_LAYOUT.md), [offline behavior](../backend/docs/OFFLINE.md) and the [implementation checklist](../backend/docs/IMPROVEMENT_CHECKLIST.md). GST exports support CA review; they do not file returns, generate IRNs or determine eligible ITC. Full double-entry accounting and multi-company support are deferred.

For small shared-core VMs, use `WEB_CONCURRENCY=1` in the private Compose `.env`. Compose uses service startup ordering without health checks. The backend entrypoint waits for PostgreSQL and completes migrations and administrator setup before serving requests. The frontend can start before the backend is ready; allow startup to finish before opening the app. See the backend deployment guide for diagnostics.

`docker-compose.vm.yml` is the image-only VM configuration with backend `127.0.0.1:8001:8000` and frontend `127.0.0.1:3001:3000`. Copy it to the existing VM deployment directory as `docker-compose.yml`, retaining its private `.env` and existing Compose project name so the same data volumes are used.

Detailed document forms show the backend-calculated total outside the charges panel, including live per-item tax updates and calculation errors. Discount entry can use a currency amount or a percentage of the items subtotal before charges/GST. Reports now have separate **FY business report** (April–March activity, receipts/payments, monthly breakdown) and **GST report** (month/custom-date tax accumulation) options with PDF/CSV exports.

Each priced item also has an optional discount section with amount/percentage entry. Item discounts are applied first; the overall discount applies to the remaining items subtotal. Create, edit, reference copying and local drafts retain both levels of discount, and the compact summary shows the gross subtotal, a single combined discount, charges when present, tax and total.

Live totals include unfinished item rows, so entering quantities/rates before descriptions still updates the total. Saving requires descriptions for valued or product-linked rows. Preview requests time out after 20 seconds; errors and offline states explain the issue and offer retry instead of showing an indefinite calculating message or an outdated amount.

Contact opening balances can be edited, cleared or switched between “They owe us” and “We owe them.” Payment adjustment forms use **Charge** and **Waiver**: a waiver settles part of the amount due without changing cash paid/received. Document item discounts remain separate from payment waivers.

Contact and account ledgers have date filters and PDF download/print. PDFs include every matching entry, across all pages. Contact print options start with the visible ledger dates; account List/Ledger controls switch the screen and PDF format. Running balances include preceding entries and previous pages. See [ledger signs and edit behavior](../backend/docs/REPORTS.md#ledgers-and-document-edits).

## Income, balances and workspace controls

Quick Actions has Bill, Invoice, Expense and Income first, optional documents next, and Transactions, Accounts, Reports and Offline files last. Settings is available directly in the header. The header theme control supports Light, Dark and System on desktop and mobile.

Income records money received into an account, with optional contact/source and simple description/amount lines. It creates no contact debt, settlement, stock or GST entry. Use an invoice for a taxable sale. Correct an income receipt through its document, including its account, date and amount; deletion can reverse the receipt or retain it using the existing keep-transactions option. FY Other income shows entered receipts separately from sales; Cash received includes each receipt once.

Edit Account includes Opening balance, including zero or a negative opening amount. This rebases current and running balances without creating cash movement or changing settled documents. Contacts retain the same opening-balance editing flow. Self transfer moves money between your accounts; Adjust is for recorded charges, interest and other adjustments. Reconcile balance records a correction to current cash, separately from opening balance.

Document create/edit/view screens are narrower and more compact. Contact/date share a desktop row, notes/attachments are optional expandable controls, and save actions remain visible while scrolling. Session validation, page/data loading and pending actions have animated, accessible feedback. Unreachable-session checks retain saved access for offline files; private server data still requires a valid server session.

Deploy with the existing Compose and environment. Startup applies the additive income migration automatically; no ports or new environment fields are required.
