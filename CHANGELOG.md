# Changelog

All notable changes to this project will be documented in this file.

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
