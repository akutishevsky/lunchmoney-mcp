# Changelog

All notable changes to this project will be documented in this file.

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
