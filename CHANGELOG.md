# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

Spec parity pass against the LunchMoney v2 OpenAPI spec (2.11.1). Every tool now exposes the request fields the spec defines, accepts `null` where the spec marks a field nullable and `null` has meaning, enforces the spec's pairing, exclusivity and min-one-field rules before any request is sent, and validates currencies, amounts, IDs and dates with shared validators (`src/schemas.ts`). Tool count grows from 59 to 65.

### Breaking

Inputs that previously reached the API and failed (or were silently coerced) are now rejected by the tool with a clear message. Valid calls are unchanged unless listed below.

- **Amounts are no longer coerced.** `null`, `""` and non-numeric strings are rejected for transaction, budget, balance and manual-account amounts. Strings may have at most 4 decimal places. Numbers and strings are forwarded as supplied.
- **Currencies are validated against the spec's 167-code enum.** Input is lowercased first, so `USD` is accepted and sent as `usd`. Unknown codes are rejected. Previously any three-character string passed through.
- **Date ranges must be paired.** `get_transactions`, `get_recurring_items`, `get_single_recurring_item` and `trigger_plaid_fetch` reject `start_date` without `end_date` (or the reverse). `get_balance_history`, `get_account_balance_history` and `get_crypto_synced_balance_history` reject a lone `start_month` or `end_month`, and reject `end_month` earlier than `start_month`.
- **Min-one-field PUT bodies return an error instead of an empty request.** `update_tag`, `update_category`, `update_transaction`, `update_transactions_bulk` and `update_manual_account` now refuse calls with no writable field. `update_manual_crypto` no longer refuses an empty body. The spec allows `{}` there, so the API decides.
- **Mutually exclusive fields are rejected.** `create_transactions` rejects `manual_account_id` and `plaid_account_id` together. Transaction updates reject `tag_ids` together with `additional_tag_ids`. `create_manual_account` and `update_manual_account` reject `closed_on` unless the status is `closed`.
- **Shape-level changes:**
    - `get_transactions`, `get_recurring_items` and `get_single_recurring_item` date params, and the `trigger_plaid_fetch` date params, accept only `YYYY-MM-DD`.
    - `closed_on` accepts only `YYYY-MM-DD`, not the spec's date-time alternative.
    - IDs must be positive integers within int32 (transaction and group IDs within int64). Zero, negative and fractional IDs are rejected.
    - `split_transaction` `category_id: null` now sends an uncategorized child. Previously `null` was coerced to `0`.
    - `create_category` and `update_category` `children` no longer treat numeric-looking strings such as `"315174"` as IDs. Pass IDs as JSON numbers.
- **`delete_category` and `delete_tag` return `isError: true` on a 422.** The dependents payload is still included, with a hint to set `force=true`. Previously this was a success-shaped result.
- **Length caps the spec does not define were removed.** Payee and notes limits on transaction writes are gone, because the spec does not define them. The live API's real limit is unverified, so long values now reach the API.

### Added

- **Six settings tools** for the spec's `/me/*` settings endpoints:
    - `get_account_settings` and `update_account_settings`: account-wide currencies, locale, display name and rule automation.
    - `get_user_settings` and `update_user_settings`: user-wide date and time display preferences.
    - `get_user_account_settings` and `update_user_account_settings`: transaction review behaviour and the default manual account.
    - The update tools need at least one field. Note that the spec marks all three PUT request schemas and the format enums as `x-internal`, so public support for the writes is uncertain.
- **Shared validators** in `src/schemas.ts`: `currency`, `locale`, `amount`, `cryptoBalance`, `id`, `isoDate`, and the user-settings format enums.
- **Missing request fields** from the spec:
    - `create_manual_account` and `update_manual_account`: `status`, `external_id`, `custom_metadata`.
    - `create_category`: `order`, `collapsed`. `update_category`: `archived_at`, `collapsed`.
    - `update_tag`: `archived_at`.
    - `upsert_account_balance_history` and `upsert_crypto_synced_balance_history` balances: optional `id` and `to_base`, which the server ignores.
    - `create_transactions`: `custom_metadata` gained a 4096-character limit, enforced on the stringified value.
- **Nullable fields** where the spec allows `null`: `display_name` and `institution_name` on manual accounts, `subtype` on manual account updates, `closed_on` on create and update, `description` on categories, `notes` on budgets (sending `null` clears it), `display_name` and `institution_name` on create-manual-crypto, `symbol` on balance-history entries, `category_id` and `notes` on split children, and `default_manual_account_id`.
- **Budget summary and settings descriptions** now state the spec's rules: occurrences are returned only for aligned responses, `aligned=false` ranges may have `null` budgeted and available values, and currency and locale come from the account settings endpoint.
- **Plaid fetch 425 handling.** `trigger_plaid_fetch` returns a clear error for `425 Too Early`, saying the account's `last_fetch` must be over a minute old. Its 202 message tells the model to verify the fetch against `last_fetch` and the other timestamps.
- **Test suite coverage** for the shared validators (`test/schemas.test.mjs`) and for the pre-request constraint rejections (`test/constraints.tool.test.mjs`).

### Fixed

- Budget `upsert_budget` and `remove_budget` `category_id` and dates are validated against the spec's int32 and `YYYY-MM-DD` rules. Previously fractional IDs and unpadded dates were forwarded.
- The flat `budgetInvalidPeriodErrorObject` 400 response from the budgets API is now formatted with its `requested_start_date`, `previous_valid_start_date` and `next_valid_start_date` values, instead of falling through to a generic message.
- Balance-history `balance` values are forwarded as the caller supplied them. Numbers are no longer stringified, and string forms are validated instead of coerced.
- `get_single_manual_crypto`, `update_manual_crypto` and the other crypto ID params now use the shared int32 ID validator.
- Response types in `src/types.ts` now match the spec: `Category.collapsed` is a required boolean, child categories are always `collapsed: false`, and the per-category `rollover_pool` was removed because the spec defines it only at the top level of the summary response. Added `AccountSettings`, `UserSettings` and `UserAccountSettings`.

## [3.0.0] - 2026-08-03

**Breaking change**, scoped to the crypto tools. Crypto was the last domain still calling LunchMoney's v1 API; this release moves it to v2, so the server no longer talks to `dev.lunchmoney.app/v1` at all. `get_all_crypto` — present in every release since 1.0.0 — is removed, because v2 has no combined crypto endpoint to back it. Every other domain is untouched. Tool count grows from 50 to 59.

### Breaking

- **`get_all_crypto` is removed.** v2 splits crypto into separate manual and synced resources with different shapes, and offers nothing equivalent to v1's combined `GET /crypto`. Use `get_all_manual_crypto` and `get_all_synced_crypto` instead — together they cover everything the old tool returned, with more detail. The bundled `net_worth_snapshot` prompt now calls both.
- **`update_manual_crypto` changed shape.** It targets `PUT /crypto/manual/{id}` on v2. All writable fields are now optional, but at least one of `name`, `display_name`, `institution_name`, or `balance` must be supplied. The `currency` parameter is gone: a manual balance's symbol is fixed when the asset is created, and v2 ignores attempts to change it.

### Added

- **Ten new crypto tools** covering v2's [crypto-manual](https://lunchmoney.dev/v2/docs#tag/crypto-manual) and [crypto-synced](https://lunchmoney.dev/v2/docs#tag/crypto-synced) endpoints: `get_supported_cryptocurrencies`, `add_supported_cryptocurrency`, `get_all_manual_crypto`, `get_single_manual_crypto`, `create_manual_crypto`, `delete_manual_crypto`, `get_all_synced_crypto`, `get_single_synced_crypto`, `get_synced_crypto_balance`, `refresh_synced_crypto`.
    - Manual crypto balances now support full CRUD, where v1 only allowed updates — assets can be created and deleted through the API for the first time.
    - Synced crypto accounts (Kraken, Coinbase, Ethereum) are readable as first-class accounts with their nested per-symbol balances, individually addressable by symbol. Connections themselves are still created only in the LunchMoney web app.
    - `add_supported_cryptocurrency` extends the manual-crypto currency list from a CoinGecko coin-page URL, so tracking a coin LunchMoney doesn't know yet no longer requires the web app.
    - `refresh_synced_crypto` triggers a provider-side balance refresh and returns the refreshed account.

### Changed

- Crypto balances are now forwarded to the API exactly as supplied, instead of being coerced to a JS number and re-stringified. v2 carries balances to 18 decimal places, which exceeds a double's precision, so a string like `0.852341920145782301` no longer silently rounds on write. Numbers are still accepted — v2 takes either — and are passed through unconverted, since stringifying them would turn a satoshi (`1e-8`) into exponential notation that the decimal format rejects.
- Removed the `apiV1` export and the `baseUrlOverride` parameter it relied on. Nothing else used them.
- `CryptoAsset` replaced by `Cryptocurrency`, `ManualCrypto`, `SyncedCryptoBalance`, and `SyncedCryptoAccount`, matching the v2 response shapes.
- Error hint fields extended so the model can recover from the new crypto failure modes without a round-trip (`crypto_manual_id`, `has_balance_history`, `required_parameter`, `allowed_values`, `coingecko_url`, `existing_coingecko_id`, `existing_symbol`). The `DELETE /crypto/manual/{id}` 422 that demands an explicit `keep_history` is the main beneficiary.

## [2.2.0] - 2026-08-01

### Security

- **`attach_file_to_transaction` no longer reads arbitrary files** ([#16](https://github.com/akutishevsky/lunchmoney-mcp/issues/16)). The tool passed the caller-supplied `file_path` straight to `readFile` with no confinement, and its MIME allow-list checked a caller-supplied `content_type` rather than the file, so any readable path — `~/.ssh/id_rsa`, a `.env`, `/etc/passwd` — could be uploaded to the LunchMoney attachments endpoint and retrieved again via `get_transaction_attachment_url`. Four changes:
    - The attachment type is now determined by sniffing the file's leading bytes, and the header is checked before the rest of the file is read. Non-media files are rejected without ever being buffered.
    - New optional `LUNCHMONEY_ATTACHMENTS_DIR` confines reads to one directory, enforced after `realpath` so `..` traversal and symlink escapes are both caught. Unset leaves reads unconfined, which preserves existing desktop behaviour; **remote/HTTP deployments should always set it**.
    - Size is now checked via `stat` before any bytes are buffered, and non-regular files are rejected — previously `readFile("/dev/zero")` would grow unbounded and exhaust memory. The file is opened with `O_NONBLOCK`, because a read-only `open(2)` on a FIFO blocks until a writer appears; without it a caller could hang a request indefinitely, pin a libuv threadpool thread, and prevent clean shutdown.
    - Filesystem errors are logged to stderr but reported to the caller generically, so failed reads no longer distinguish `ENOENT` from `EACCES` and leak filesystem structure.

### Added

- **Balance history tools** — Get and manage monthly balance snapshots across all accounts (used by the Net Worth views). Nine new tools: `get_balance_history`, `get_account_balance_history`, `upsert_account_balance_history`, `delete_account_balance_history`, `get_crypto_synced_balance_history`, `upsert_crypto_synced_balance_history`, `delete_crypto_synced_balance_history`, `delete_balance_history_entry`, `update_deleted_account_details`. Tool count grows from 41 to 50.
- **Test suite** (`npm test`), the project's first. Runs on Node's built-in test runner over the compiled output, so it typechecks as well. 78 tests covering `src/attachments.ts` — content sniffing, path confinement, resource limits — plus the `attach_file_to_transaction` tool boundary driven through a real MCP client over an in-memory transport. Every regression described in this release has a test pinning it. Wired into CI via `.github/workflows/test.yml`.
- **Automated publishing** — pushes to `main` publish to npm and the MCP Registry when `package.json` carries a version that is not yet published, so non-release commits are a no-op (`.github/workflows/publish-mcp.yml`).

### Changed

- Attachment reading moved out of `src/tools/transactions.ts` into `src/attachments.ts`, so it can be unit-tested without standing up an `McpServer`. No behaviour change.
- `attach_file_to_transaction`'s `content_type` parameter is now an optional enum of the allowed types and is treated as an assertion: the file's real type always wins, and a mismatch is rejected rather than silently corrected. Previously it selected the declared type outright. HEIC and HEIF are exempt from the mismatch check, since the ISO-BMFF major brand does not reliably distinguish them (many `.HEIC` files, iOS ones included, carry `mif1`).
- Updated to TypeScript 7 and refreshed dependencies.

### Fixed

- `%PDF-` is no longer required at byte 0. The PDF spec tolerates leading bytes and conforming readers scan for the marker, so PDFs from scanners that emit a preamble were being rejected.
- An unset optional `user_config` field in a `.mcpb` install arrives as the literal `${user_config.LUNCHMONEY_ATTACHMENTS_DIR}` template rather than being omitted. That string is truthy, so it was treated as a configured directory and made `attach_file_to_transaction` fail for every Claude Desktop user who left the field blank. Unsubstituted templates are now treated as unset.

## [2.1.1] - 2026-05-31

### Fixed

- TOON formatting now properly compacts arrays of objects by dropping keys that are blank in every row while preserving partially-present keys as explicit nulls, ensuring uniform structure for optimal token compression.
- Primitive arrays (e.g., `tag_ids`) are now joined to a single pipe-delimited scalar, further reducing TOON output size.

## [2.1.0] - 2026-05-19

### Added

- **Library embedding support**: Package now exposes subpath exports (`./server`, `./config`, `./prompts`) to enable embedding in custom transports (HTTP, Cloudflare Workers, etc.) without forking.
- **`createServer()` factory**: Extracted server construction into a reusable factory function in `src/server.ts`, enabling non-stdio runtimes to wire the MCP server into their own transports.
- **TypeScript declarations**: Added `declaration: true` to tsconfig, emitting `.d.ts` files alongside `.js` in `build/`.
- **JSDoc documentation**: Added comprehensive JSDoc on `createServer()` and `initializeConfig()` including single-tenant warning and deployment patterns.
- **Documentation**: New "Embedding as a library" and "Remote Deployments" sections in README covering Cloudflare Workers and Express HTTP patterns.

### Changed

- **Config API**: `initializeConfig()` now takes `lunchmoneyApiToken` as an argument instead of reading from `process.env.LUNCHMONEY_API_TOKEN`. Env var read moved to stdio entry point. This allows non-Node runtimes to pass credentials from their own sources.
- **Package exports**: Normalized root export from `"default"` to `"import"` in package.json for consistency with subpaths. Removed `./tools/*` subpath exports to avoid locking tool module layout as public API.

### Fixed

- Decoupled config singleton from process.env, enabling the package to be embedded in runtimes where `process.env` is unavailable (e.g., Cloudflare Workers post-esbuild).

## [2.0.1] - 2026-04-30

### Fixed

- `get_all_crypto` now calls LunchMoney's v1 `GET /crypto` endpoint so it returns synced and manually-managed crypto holdings.
- `update_manual_crypto` now calls LunchMoney's v1 `PUT /crypto/manual/:id` endpoint for manually-managed crypto assets.

## [2.0.0] - 2026-04-15

**Breaking change.** Migrates the entire MCP server from LunchMoney's v1 API (`https://dev.lunchmoney.app/v1`) to the v2 API (`https://api.lunchmoney.dev/v2`, currently in alpha). v2 is not backwards-compatible with v1, and this release is not backwards-compatible with v1.x of this server. Tool count grows from 29 to 41.

### Breaking

- **Base URL changed** to `https://api.lunchmoney.dev/v2`. Existing `LUNCHMONEY_API_TOKEN` works unchanged.
- **`assets` renamed to `manual_accounts`** everywhere. `get_all_assets` / `create_asset` / `update_asset` are now `get_all_manual_accounts` / `create_manual_account` / `update_manual_account`. Field renames in request bodies: `type_name` → `type`, `subtype_name` → `subtype`, `exclude_transactions` → `exclude_from_transactions`.
- **Transaction field renames** affecting both filters and bodies: `asset_id` → `manual_account_id`, `tags` (array of `{id, name}`) → `tag_ids` (array of integers), `is_group` filter → `is_group_parent`. User response: `user_id` / `user_name` / `user_email` → `id` / `name` / `email`.
- **`debit_as_negative` is gone.** v2 always uses signed amounts (positive = debit, negative = credit) on every transaction endpoint.
- **`update_transaction` body is no longer wrapped** in `{ transaction: { ... } }`. The new `update_transaction` tool takes the partial update under an `update` field and exposes `update_balance` (boolean query param, default true) instead of v1's `skip_balance_update`.
- **Transaction status enum changed** from `cleared` / `uncleared` / `pending` to `reviewed` / `unreviewed` / `delete_pending` (and writeable values are limited to `reviewed` / `unreviewed`).
- **Categories consolidated.** Dropped `create_category_group`, `add_to_category_group`, `force_delete_category`. `create_category` and `update_category` now handle category groups via `is_group` and `children` fields. `delete_category` accepts a `force` boolean to override the dependency check.
- **Crypto endpoints removed in v2.** `get_all_crypto` and `update_manual_crypto` are preserved as tool names but rewritten as thin wrappers over `/manual_accounts` (filtering / updating accounts where `type === "cryptocurrency"`).
- **Budget summary moved.** `get_budget_summary` now calls `GET /summary` instead of `GET /budgets`. Response shape is different and supports new include flags (`include_occurrences`, `include_totals`, `include_rollover_pool`, etc).
- Dropped `unsplit_transactions` (POST) and `get_transaction_group` (GET) v1 tools — see the new tools below.

### Added

- **Tags CRUD**: `get_single_tag`, `create_tag`, `update_tag`, `delete_tag` (with `force` flag).
- **Manual accounts CRUD**: `get_single_manual_account`, `delete_manual_account` (with `delete_items` and `delete_balance_history` flags).
- **Plaid accounts**: `get_single_plaid_account`. `trigger_plaid_fetch` now accepts optional `start_date`, `end_date`, and `id` to scope the fetch.
- **Recurring items**: `get_single_recurring_item`. `get_recurring_items` adds `include_suggested`.
- **Budgets**: `get_budget_settings` (GET `/budgets/settings`). `upsert_budget` adds optional `notes`.
- **Transactions** — many new filters on `get_transactions`: `created_since`, `updated_since`, `manual_account_id`, `plaid_account_id`, `is_pending`, `include_pending`, `include_metadata`, `include_split_parents`, `include_group_children`, `include_children`, `include_files`. Limit max raised from 500 to 2000.
- **Transactions** — new tools: `delete_transaction`, `update_transactions_bulk`, `delete_transactions_bulk` (each capped at 500), `split_transaction`, `unsplit_transaction`, `attach_file_to_transaction` (multipart upload from a local file path), `get_transaction_attachment_url`, `delete_transaction_attachment`.
- `update_transaction` exposes the new `additional_tag_ids` field for additive (vs. replacement) tag semantics.
- `api.upload(path, formData)` helper added in `src/api.ts` for multipart uploads, with the same auth and retry behavior as the JSON helpers.
- `api.delete(path, body?)` accepts an optional JSON body to support `DELETE /transactions`.

### Changed

- All list-style tools now pass through the v2 envelope (e.g. `{ tags: [...] }`, `{ manual_accounts: [...] }`, `{ transactions: [...], has_more }`) instead of unwrapping to a bare array.
- Response handling for 204 No Content is explicit on every DELETE-style tool.

## [1.4.3] - 2026-03-20

### Fixed

- Use `z.coerce.number()` for all numeric tool parameters to accept string-typed values from MCP clients (fixes #8)

## [1.4.2] - 2026-02-18

### Added

- Debug logging for API requests and responses (method, path, status, duration, response body) via `LUNCHMONEY_DEBUG` environment variable

### Changed

- Added `LUNCHMONEY_DEBUG` configuration to manifest, server, and package for debug logging support

## [1.4.1] - 2026-02-18

### Changed

- Added `mcpName` to package.json for MCP Registry ownership verification
- Updated server.json to include package version

## [1.4.0] - 2026-02-15

### Added

- ESLint configuration with `@typescript-eslint` for code quality and consistency
- Graceful shutdown handlers via SIGINT/SIGTERM signals
- Input validation for dates, lengths, and currency codes in transaction tools
- Shared API client with configurable timeouts and automatic retry logic

### Changed

- Server now reads version from `package.json` dynamically instead of hardcoding
- Enhanced error logging with `catchError` on server shutdown
- Replaced `any` types with `Record<string, unknown>` for better type safety
- Improved category update handling: made name optional, fixed defaults, use numeric IDs
- Made `category_id` required in `delete_category` and `force_delete_category` tools

## [1.3.0] - 2026-02-15

### Added

- Support for `plaid_account_id` parameter in `create_transactions` and `update_transaction` tools to associate transactions with Plaid accounts

### Changed

- Updated copyright year to 2026
- Enhanced README with table of contents

## [1.2.0] - 2026-02-15

### Added

- MCP prompts for common financial workflows (e.g., expense analysis, budget planning)
- Tool annotations (read-only, idempotent, destructive, open-world) for all tools to guide AI behavior

### Changed

- Updated MCP SDK to v1.26.0 with support for tool annotations
- Migrated to `registerTool()` API (replaces direct tool registration)
- Modernized tsconfig with `NodeNext` module resolution, `isolatedModules`, and `sourceMaps`

### Fixed

- Remove deprecated `capabilities` from McpServer constructor
- Use `prompts_generated` flag in DXT manifest
- Replace `prepublish` script with `prepublishOnly` for npm compatibility
- Add `--allowedTools` flag to `prepublish:changelog` script for automated changelog generation

## [1.1.1] - 2026-02-15

### Fixed

- Removed nested `input` wrapper from all 23 parameterized tool schemas, fixing compatibility with clients (e.g. Claude AI) that send arguments flat rather than nested under an `input` key

## [1.1.0] - 2026-02-15

### Added

- TOON format support for tool responses, reducing token usage by 30-50% compared to JSON
- Null field stripping from API responses before TOON encoding for further token savings
- Detailed error handling for all LunchMoney API responses with extracted error messages
- Try/catch wrappers on all tool handlers to gracefully handle network failures
- Prettier code formatter with `npm run format` script
- Husky pre-commit hook to auto-format code on every commit
- MCP Inspector script (`npm run inspect`)
- `server.json` for MCP registry listing
- `CLAUDE.md` for Claude Code guidance

### Changed

- Migrated from DXT to MCPB packaging format (using `@anthropic-ai/mcpb`)
- All tool responses now use `formatData()` (TOON encoding) instead of `JSON.stringify()`

## [1.0.2] - 2026-02-15

### Changed

- Bumped version for MCPB migration (intermediate release)

## [1.0.1] - 2025-07-27

### Added

- npm package publishing support with `.npmignore` and shebang entry point
- Dev script for running with MCP Inspector

## [1.0.0] - 2025-07-27

### Added

- Initial release with 29 tools across 9 domains
- **User** — `get_user`
- **Categories** — `get_all_categories`, `get_single_category`, `create_category`, `create_category_group`, `update_category`, `add_to_category_group`, `delete_category`, `force_delete_category`
- **Tags** — `get_all_tags`
- **Transactions** — `get_transactions`, `get_single_transaction`, `create_transactions`, `update_transaction`, `unsplit_transactions`, `get_transaction_group`, `create_transaction_group`, `delete_transaction_group`
- **Recurring Items** — `get_recurring_items`
- **Budgets** — `get_budget_summary`, `upsert_budget`, `remove_budget`
- **Assets** — `get_all_assets`, `create_asset`, `update_asset`
- **Plaid Accounts** — `get_all_plaid_accounts`, `trigger_plaid_fetch`
- **Crypto** — `get_all_crypto`, `update_manual_crypto`
- Configuration via `LUNCHMONEY_API_TOKEN` environment variable
- TypeScript + Zod type-safe implementation
- stdio transport via MCP SDK
- DXT packaging support for Claude Desktop
- Application icon
