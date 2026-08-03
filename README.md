[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/akutishevsky-lunchmoney-mcp-badge.png)](https://mseep.ai/app/akutishevsky-lunchmoney-mcp)

# LunchMoney MCP Server

[![npm version](https://img.shields.io/npm/v/@akutishevsky/lunchmoney-mcp)](https://www.npmjs.com/package/@akutishevsky/lunchmoney-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@akutishevsky/lunchmoney-mcp?label=npm%20downloads)](https://www.npmjs.com/package/@akutishevsky/lunchmoney-mcp)
[![GitHub downloads](https://img.shields.io/github/downloads/akutishevsky/lunchmoney-mcp/total?label=release%20downloads)](https://github.com/akutishevsky/lunchmoney-mcp/releases)
[![license](https://img.shields.io/npm/l/@akutishevsky/lunchmoney-mcp)](https://github.com/akutishevsky/lunchmoney-mcp/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![MCP Badge](https://lobehub.com/badge/mcp/akutishevsky-lunchmoney-mcp?style=plastic)](https://lobehub.com/mcp/akutishevsky-lunchmoney-mcp)

A Model Context Protocol (MCP) server implementation for [LunchMoney](https://lunchmoney.app/), providing programmatic access to personal finance management through LunchMoney's API. Also available as an MCP Bundle (.mcpb) for easy installation in Claude Desktop.

> **Heads up — v3.0.0 removes `get_all_crypto`.** The crypto tools now use LunchMoney's v2 crypto endpoints, which split manual and synced holdings into separate resources and offer no combined equivalent of v1's `GET /crypto`. Replace `get_all_crypto` with `get_all_manual_crypto` and `get_all_synced_crypto`, which together return everything it did and more. `update_manual_crypto` also drops its `currency` parameter. Nothing outside the crypto domain changed; if you don't use the crypto tools, upgrading from 2.x needs no action. See [CHANGELOG.md](./CHANGELOG.md). If you depend on `get_all_crypto`, pin `@akutishevsky/lunchmoney-mcp@^2.2.0`.

> **Heads up — v2.0.0 is a breaking release.** This server now targets LunchMoney's v2 API (`https://api.lunchmoney.dev/v2`, currently in alpha). It is not backwards-compatible with v1.x of this server: tool names, fields, and endpoint shapes have changed (for example, `assets` is now `manual_accounts`, `tags` arrays are now `tag_ids`, transaction `asset_id` is now `manual_account_id`, the `debit_as_negative` toggle is gone, and the budget summary moved to a new `/summary` endpoint). See [CHANGELOG.md](./CHANGELOG.md) for the full list. If you depend on v1.x, pin `@akutishevsky/lunchmoney-mcp@^1.4.3`.

<a href="https://glama.ai/mcp/servers/@akutishevsky/lunchmoney-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@akutishevsky/lunchmoney-mcp/badge" alt="LunchMoney Server MCP server" />
</a>

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Usage](#usage)
    - [Installation Options](#installation-options)
        - [MCP Bundle](#mcp-bundle)
        - [Claude Code CLI](#claude-code-cli)
        - [Codex CLI](#codex-cli)
        - [Manual MCP Configuration](#manual-mcp-configuration)
    - [Standalone Server](#standalone-server)
- [Remote Deployments](#remote-deployments)
- [Example Prompts](#example-prompts)
- [Available Tools](#available-tools)
- [Development](#development)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

## Overview

This MCP server enables AI assistants and other MCP clients to interact with LunchMoney data, allowing for automated financial insights, transaction management, budgeting, and more.

## Features

### Comprehensive Tool Coverage

- **User Management** - Access user account details
- **Categories** - Full CRUD on categories and category groups
- **Tags** - Full CRUD for transaction tags
- **Transactions** - Full CRUD with advanced filtering, bulk update, bulk delete, splits, groups, and file attachments
- **Recurring Items** - Track and manage recurring expenses, including system-suggested items
- **Budgets** - Per-period budget summary, account-wide budget settings, upsert, and delete
- **Manual Accounts** - Full CRUD for manually-managed accounts (formerly known as "assets")
- **Plaid Accounts** - List, retrieve, and trigger sync of connected bank accounts
- **Cryptocurrency** - Full CRUD for manual crypto balances, read and refresh synced crypto accounts, and manage the supported-cryptocurrency list
- **Balance History** - Read, upsert, and delete monthly balance history for manual, Plaid, crypto, and deleted accounts

### Key Capabilities

- Full integration with LunchMoney API v2 (alpha)
- Type-safe implementation with TypeScript and Zod validation
- Token-efficient responses using [TOON](https://github.com/nicfontaine/toon) encoding instead of JSON, reducing token usage in AI conversations
- Modular architecture for easy extension
- Standard MCP server implementation using stdio transport

## Usage

### Installation Options

<a id="mcp-bundle"></a>

#### MCP Bundle (.mcpb) - Recommended

The easiest way to install this server is as an MCP Bundle in Claude Desktop:

1. Download the latest `.mcpb` file from the [releases page](https://github.com/akutishevsky/lunchmoney-mcp/releases)
2. Open Claude Desktop and go to Extensions
3. Click "Install Extension" and select the downloaded `.mcpb` file
4. Enter your LunchMoney API token when prompted (get it from [LunchMoney Developer Settings](https://my.lunchmoney.app/developers))
5. The LunchMoney tools will be immediately available

<a id="claude-code-cli"></a>

<details>
<summary><strong>Claude Code CLI</strong></summary>

Add the LunchMoney MCP server to Claude Code:

```bash
claude mcp add lunchmoney --transport stdio -e LUNCHMONEY_API_TOKEN=your-api-token-here -- npx -y @akutishevsky/lunchmoney-mcp
```

To enable debug logging:

```bash
claude mcp add lunchmoney --transport stdio -e LUNCHMONEY_API_TOKEN=your-api-token-here -e LUNCHMONEY_DEBUG=true -- npx -y @akutishevsky/lunchmoney-mcp
```

Verify the server was added:

```bash
claude mcp list
claude mcp get lunchmoney
```

</details>

<a id="codex-cli"></a>

<details>
<summary><strong>Codex CLI</strong></summary>

Add the LunchMoney MCP server to Codex:

```bash
codex mcp add lunchmoney --env LUNCHMONEY_API_TOKEN=your-api-token-here -- npx -y @akutishevsky/lunchmoney-mcp
```

To enable debug logging:

```bash
codex mcp add lunchmoney --env LUNCHMONEY_API_TOKEN=your-api-token-here --env LUNCHMONEY_DEBUG=true -- npx -y @akutishevsky/lunchmoney-mcp
```

Verify the server was added:

```bash
codex mcp list
codex mcp get lunchmoney
```

</details>

<a id="manual-mcp-configuration"></a>

<details>
<summary><strong>Manual MCP Configuration</strong></summary>

To use this MCP server with any MCP-compatible client (such as Claude Desktop), you need to add it to the client's configuration.

##### Configuration

The server can be configured in your MCP client's configuration file. The exact location and format may vary by client, but typically follows this pattern:

```json
{
    "mcpServers": {
        "lunchmoney": {
            "command": "npx",
            "args": ["@akutishevsky/lunchmoney-mcp"],
            "env": {
                "LUNCHMONEY_API_TOKEN": "your-api-token-here",
                "LUNCHMONEY_DEBUG": "true"
            }
        }
    }
}
```

> **Note:** `LUNCHMONEY_DEBUG` is optional. Set it to `"true"` to enable debug logging of API requests and responses to stderr. Useful for troubleshooting.

> **Note:** `LUNCHMONEY_ATTACHMENTS_DIR` is optional. `attach_file_to_transaction` is the only tool that reads from your filesystem, and it always verifies that a file really is a JPEG, PNG, HEIC, HEIF, or PDF before uploading it. Set this variable to a directory (say, a `~/Receipts` folder) to additionally restrict it to files inside that directory — `..` and symlinks that point outside are rejected. Leave it unset and any path the server can read is fair game, which is usually fine for a local stdio server but **not** for [remote deployments](#remote-deployments).

Replace `"your-api-token-here"` with your actual LunchMoney API token from [LunchMoney Developer Settings](https://my.lunchmoney.app/developers).

##### Common MCP Client Configuration Locations

Different MCP clients store their configuration in different locations:

- **Claude Desktop**:
    - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
    - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
    - Linux: `~/.config/Claude/claude_desktop_config.json`

- **Other MCP Clients**: Check your client's documentation for the configuration file location.

##### Setup Steps

1. Locate your MCP client's configuration file (create it if it doesn't exist).
2. Add the LunchMoney server configuration to the `mcpServers` section.
3. Save the file and restart your MCP client.
4. The LunchMoney tools should now be available in your client.

##### Requirements

- Node.js 16+ installed on your system
- `npx` available in your system PATH
- Valid LunchMoney API token with appropriate permissions

</details>

### Standalone Server

```bash
# Run with npx
LUNCHMONEY_API_TOKEN="your-api-token" npx @akutishevsky/lunchmoney-mcp
```

## Remote Deployments

The bundled stdio binary covers desktop MCP clients, but Claude on mobile and the [custom connectors](https://support.anthropic.com/en/articles/11503834-using-custom-connectors-with-claude) feature in [claude.ai](https://claude.ai) only speak HTTP. There are two ways to expose this server remotely.

### Turnkey: Cloudflare Workers

[lunchmoney-mcp-cloudflare](https://github.com/bm1549/lunchmoney-mcp-cloudflare) wraps this package as a Cloudflare Worker with Google sign-in and an email allowlist in front of the MCP endpoint. The whole stack fits inside Cloudflare's and Google Cloud's free tiers, and a `setup.sh` wizard handles KV creation, OAuth client setup, secrets, and deploy in one walkthrough. Each authenticated user runs in their own Durable Object, so the [config singleton](#embedding-as-a-library) stays per-user.

### Self-hosted: HTTP transport on your own host

For a single-user deployment, wire `createServer()` into [`StreamableHTTPServerTransport`](https://github.com/modelcontextprotocol/typescript-sdk#streamable-http-transport) and serve it from any Node HTTP framework. Example with Express:

```ts
import express from "express";
import { createServer } from "@akutishevsky/lunchmoney-mcp/server";
import { initializeConfig } from "@akutishevsky/lunchmoney-mcp/config";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

initializeConfig(process.env.LUNCHMONEY_API_TOKEN!);
const server = createServer("1.0.0");

const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
});
await server.connect(transport);

const app = express();
app.use(express.json());
app.all("/mcp", (req, res) => transport.handleRequest(req, res, req.body));
app.listen(3000);
```

Swap Express for Hono (via `@hono/node-server`) or Fastify if you prefer — the transport only needs Node's `IncomingMessage` and `ServerResponse`. Add your own auth in front of `/mcp` — the package ships no transport-level auth.

> **Set `LUNCHMONEY_ATTACHMENTS_DIR` on any remote deployment.** `attach_file_to_transaction` reads a path supplied by the caller off the host's filesystem. On a desktop stdio server the caller and the file owner are the same person, so that is unremarkable. Once the server is reachable over HTTP they are different principals, and an unconfined read is a way for a remote caller — or a prompt-injected model — to pull files off your host. Point the variable at a dedicated directory and keep nothing else in it. The content-type check (only real JPEG/PNG/HEIC/HEIF/PDF files upload) applies either way, but it is a backstop, not a substitute.

> **Multi-tenant warning.** This pattern serves one user from one process with one shared API token. To serve multiple users from a single Node process you'd hit the [single-tenant config singleton](#embedding-as-a-library); fork the process per user or use the Cloudflare option above (each user gets their own isolate).

## Example Prompts

Here are some example prompts you can use with the LunchMoney MCP server:

### Account Overview

- "Show me my LunchMoney account details"
- "What's my current account status?"

### Category Management

- "List all my spending categories"
- "Create a new category called 'Subscriptions' with a monthly budget of $100"
- "Show me details for my 'Food & Dining' category"
- "Create a category group for all my entertainment expenses"
- "Delete the 'Unused Category' and reassign its transactions to 'Miscellaneous'"

### Transaction Management

- "Show me all transactions from last month"
- "Find all transactions over $100 in the past week"
- "Create a new expense for $45.99 at Amazon in the Shopping category"
- "Update transaction #12345 to change the amount to $50"
- "Show me all pending transactions"
- "Group these coffee shop transactions together"

### Budgeting

- "Show me my budget summary for this month"
- "Set a budget of $500 for Groceries this month"
- "Remove the budget for Entertainment category"
- "How much have I spent vs budgeted in each category?"

### Manual Account Tracking

- "List all my manual accounts"
- "Create a new manual account for my savings account with a balance of $10,000"
- "Update my investment account balance to $25,000"
- "Close my old credit card account"

### Recurring Expenses

- "Show me all my recurring expenses"
- "What subscriptions do I have?"
- "List recurring items for the next 3 months"

### Banking Integration

- "Show me all my connected Plaid accounts"
- "Refresh my bank account data"
- "Trigger a sync for my checking account"

### Cryptocurrency

- "Show me all my crypto holdings"
- "Update my Bitcoin balance to 0.5 BTC"
- "List all my manually tracked crypto assets"
- "Add a cold wallet holding 0.85 BTC called Ledger Cold Storage"
- "Refresh my Coinbase account and show the updated balances"
- "Which cryptocurrencies can I track manually?"

### Net Worth & Balance History

- "Show me how my net worth changed over the last 12 months"
- "What was my savings account balance in March 2026?"
- "Set my car's value to $18,000 for June 2026"
- "Clear the balance history for my old brokerage account"

### Analysis & Insights

- "What are my top spending categories this month?"
- "Show me all transactions tagged as 'vacation'"
- "Find all transactions at coffee shops"
- "List all transactions that need to be categorized"

## Available Tools

### User Tools

- `get_user` - Retrieve current user details

### Category Tools

- `get_all_categories` - List all categories (supports `format` and `is_group` filters)
- `get_single_category` - Get details for a specific category or category group
- `create_category` - Create a category or category group (set `is_group=true` plus `children`)
- `update_category` - Update properties; replaces the children list on category groups
- `delete_category` - Delete a category; pass `force=true` to override dependency check

### Tag Tools

- `get_all_tags` - List all tags
- `get_single_tag` - Get a tag by ID
- `create_tag` - Create a new tag
- `update_tag` - Update tag properties
- `delete_tag` - Delete a tag (with `force` to override dependents)

### Transaction Tools

- `get_transactions` - List transactions with extensive filtering options (date range, account, category, tag, status, pending, metadata, files, etc)
- `get_single_transaction` - Get full transaction details (always includes plaid_metadata, custom_metadata, files, and children for split/group parents)
- `create_transactions` - Insert 1–500 transactions in one call
- `update_transaction` - Partial update of one transaction
- `delete_transaction` - Delete one transaction (cannot be split/group)
- `update_transactions_bulk` - Bulk update 1–500 transactions
- `delete_transactions_bulk` - Bulk delete 1–500 transactions by ID
- `create_transaction_group` - Create a transaction group from existing transactions
- `delete_transaction_group` - Ungroup a transaction group
- `split_transaction` - Split a transaction into 2–500 children
- `unsplit_transaction` - Undo a previous split
- `attach_file_to_transaction` - Upload a local file (jpeg/png/heic/heif/pdf, ≤10MB), type verified from its contents
- `get_transaction_attachment_url` - Get a signed download URL for a file attachment
- `delete_transaction_attachment` - Delete a file attachment

### Recurring Items Tools

- `get_recurring_items` - List recurring items for a date range (`include_suggested` for system suggestions)
- `get_single_recurring_item` - Get a recurring item by ID

### Budget Tools

- `get_budget_summary` - Per-category budget summary (backed by `/summary`); supports occurrences, totals, rollover-pool toggles
- `get_budget_settings` - Account-wide budget period and display settings
- `upsert_budget` - Create or update a budget for a category and period
- `remove_budget` - Remove a budget for a category and period

### Manual Account Tools

- `get_all_manual_accounts` - List all manually-managed accounts (formerly "assets")
- `get_single_manual_account` - Get a manual account by ID
- `create_manual_account` - Create a new manually-managed account
- `update_manual_account` - Update properties of a manual account
- `delete_manual_account` - Delete a manual account; optionally also delete its transactions / balance history

### Plaid Account Tools

- `get_all_plaid_accounts` - List all connected Plaid accounts
- `get_single_plaid_account` - Get a Plaid account by ID
- `trigger_plaid_fetch` - Trigger fetch of latest data from Plaid (optionally scoped to a date range or account)

### Crypto Tools

- `get_supported_cryptocurrencies` - List the cryptocurrencies supported for manual tracking
- `add_supported_cryptocurrency` - Add a cryptocurrency to the supported list from its CoinGecko coin-page URL
- `get_all_manual_crypto` - List all manually-managed crypto balances
- `get_single_manual_crypto` - Get a single manually-managed crypto balance by ID
- `create_manual_crypto` - Create a manually-managed crypto asset
- `update_manual_crypto` - Update a manual crypto balance's name, display name, institution name, or balance
- `delete_manual_crypto` - Delete a manual crypto asset (irreversible)
- `get_all_synced_crypto` - List synced crypto accounts and their nested per-symbol balances
- `get_single_synced_crypto` - Get a single synced crypto account by ID
- `get_synced_crypto_balance` - Get one balance inside a synced crypto account by symbol
- `refresh_synced_crypto` - Trigger a balance refresh for a synced crypto account

### Balance History Tools

- `get_balance_history` - Get monthly balance history across all accounts (powers the Net Worth views); optional `start_month`/`end_month` (YYYY-MM) range filter
- `get_account_balance_history` - Get monthly balance history for one account (`manual`, `plaid`, `crypto_manual`, or `deleted`)
- `upsert_account_balance_history` - Create or update monthly balance entries for one account (past months only; all-or-nothing)
- `delete_account_balance_history` - Delete all historical balance entries for one account
- `get_crypto_synced_balance_history` - Get monthly balance history for a synced crypto holding by account id + ticker symbol
- `upsert_crypto_synced_balance_history` - Create or update monthly balance entries for a synced crypto holding
- `delete_crypto_synced_balance_history` - Delete all historical balance entries for a synced crypto holding
- `delete_balance_history_entry` - Delete a single historical balance entry by id
- `update_deleted_account_details` - Update the display details (name, institution, type, subtype, mask) shown for a deleted account's balance history

## Development

### Project Structure

```
lunchmoney-mcp/
├── src/
│   ├── index.ts           # Server entry point
│   ├── config.ts          # Configuration management
│   ├── types.ts           # TypeScript type definitions
│   └── tools/             # Tool implementations
│       ├── user.ts
│       ├── categories.ts
│       ├── tags.ts
│       ├── transactions.ts
│       ├── recurring-items.ts
│       ├── budgets.ts
│       ├── manual-accounts.ts
│       ├── plaid-accounts.ts
│       ├── crypto.ts
│       └── balance-history.ts
├── build/                 # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
# Build the MCP server
npm run build

# Build MCPB package for distribution
npm run build:mcpb
```

### Adding New Tools

1. Create a new file in `src/tools/`
2. Implement tool handlers using the MCP SDK
3. Register tools in `src/index.ts`
4. Add types to `src/types.ts` if needed

### Embedding as a library

The package exposes subpath entry points so it can be embedded in a custom transport (for example, a Cloudflare Worker that serves the MCP protocol over HTTP) rather than only the bundled stdio binary:

```ts
import { createServer } from "@akutishevsky/lunchmoney-mcp/server";
import { initializeConfig } from "@akutishevsky/lunchmoney-mcp/config";

initializeConfig(process.env.LUNCHMONEY_API_TOKEN!);
const server = createServer("1.0.0");
// connect `server` to whatever transport you need
```

`initializeConfig` must be called before any tool is invoked, or the first request throws `"Configuration not initialized."`.

> **Single-tenant assumption.** The config is held in a module-level singleton. That is safe on per-isolate runtimes — each user gets their own isolate, so there is no shared mutable state to race on. It is **not** safe on shared-process multi-tenant Node hosts (e.g. one Express or Hono process serving multiple users): concurrent `initializeConfig` calls would race and leak tokens between requests. Those consumers need to fork per-user or refactor the singleton before exposing the package.

## API Reference

The server implements the full LunchMoney API v2. For detailed API documentation, see:

- [LunchMoney v2 API Documentation](https://alpha.lunchmoney.dev/v2)
- [v2 Migration Guide](https://alpha.lunchmoney.dev/v2/migration-guide)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License
