# LunchMoney MCP Server

[![npm version](https://img.shields.io/npm/v/@akutishevsky/lunchmoney-mcp)](https://www.npmjs.com/package/@akutishevsky/lunchmoney-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@akutishevsky/lunchmoney-mcp?label=npm%20downloads)](https://www.npmjs.com/package/@akutishevsky/lunchmoney-mcp)
[![GitHub downloads](https://img.shields.io/github/downloads/akutishevsky/lunchmoney-mcp/total?label=release%20downloads)](https://github.com/akutishevsky/lunchmoney-mcp/releases)
[![license](https://img.shields.io/npm/l/@akutishevsky/lunchmoney-mcp)](https://github.com/akutishevsky/lunchmoney-mcp/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

A Model Context Protocol (MCP) server implementation for [LunchMoney](https://lunchmoney.app/), providing programmatic access to personal finance management through LunchMoney's API. Also available as an MCP Bundle (.mcpb) for easy installation in Claude Desktop.

<a href="https://glama.ai/mcp/servers/@akutishevsky/lunchmoney-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@akutishevsky/lunchmoney-mcp/badge" alt="LunchMoney Server MCP server" />
</a>

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Usage](#usage)
    - [Installation Options](#installation-options)
    - [As a standalone MCP server](#as-a-standalone-mcp-server)
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
- **Categories** - Create, update, and organize spending categories
- **Tags** - Manage transaction tags
- **Transactions** - Full CRUD operations on transactions with advanced filtering
- **Recurring Items** - Track and manage recurring expenses
- **Budgets** - Create and monitor budgets by category
- **Assets** - Track manually-managed assets
- **Plaid Accounts** - Manage connected bank accounts
- **Cryptocurrency** - Track crypto holdings

### Key Capabilities

- Full integration with LunchMoney API v1
- Type-safe implementation with TypeScript and Zod validation
- Token-efficient responses using [TOON](https://github.com/nicfontaine/toon) encoding instead of JSON, reducing token usage in AI conversations
- Modular architecture for easy extension
- Standard MCP server implementation using stdio transport

## Usage

### Installation Options

#### Option 1: MCP Bundle (.mcpb) - Recommended

The easiest way to install this server is as an MCP Bundle in Claude Desktop:

1. Download the latest `.mcpb` file from the [releases page](https://github.com/akutishevsky/lunchmoney-mcp/releases)
2. Open Claude Desktop and go to Extensions
3. Click "Install Extension" and select the downloaded `.mcpb` file
4. Enter your LunchMoney API token when prompted (get it from [LunchMoney Developer Settings](https://my.lunchmoney.app/developers))
5. The LunchMoney tools will be immediately available

#### Option 2: Manual MCP Configuration

To use this MCP server with any MCP-compatible client (such as Claude Desktop), you need to add it to the client's configuration.

#### Configuration

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

Replace `"your-api-token-here"` with your actual LunchMoney API token from [LunchMoney Developer Settings](https://my.lunchmoney.app/developers).

#### Common MCP Client Configuration Locations

Different MCP clients store their configuration in different locations:

- **Claude Desktop**:
    - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
    - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
    - Linux: `~/.config/Claude/claude_desktop_config.json`

- **Other MCP Clients**: Check your client's documentation for the configuration file location.

#### Setup Steps

1. Locate your MCP client's configuration file (create it if it doesn't exist).
2. Add the LunchMoney server configuration to the `mcpServers` section.
3. Save the file and restart your MCP client.
4. The LunchMoney tools should now be available in your client.

#### Requirements

- Node.js 16+ installed on your system
- `npx` available in your system PATH
- Valid LunchMoney API token with appropriate permissions

### As a standalone MCP server

```bash
# Run with npx
LUNCHMONEY_API_TOKEN="your-api-token" npx @akutishevsky/lunchmoney-mcp
```

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

### Asset Tracking

- "List all my assets"
- "Create a new asset for my savings account with a balance of $10,000"
- "Update my investment account balance to $25,000"

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

### Analysis & Insights

- "What are my top spending categories this month?"
- "Show me all transactions tagged as 'vacation'"
- "Find all transactions at coffee shops"
- "List all transactions that need to be categorized"

## Available Tools

### User Tools

- `get_user` - Retrieve current user details

### Category Tools

- `get_all_categories` - List all spending categories
- `get_single_category` - Get details for a specific category
- `create_category` - Create a new category
- `create_category_group` - Create a category group
- `update_category` - Update category properties
- `add_to_category_group` - Add categories to a group
- `delete_category` - Delete a category
- `force_delete_category` - Force delete with data cleanup

### Tag Tools

- `get_all_tags` - List all available tags

### Transaction Tools

- `get_transactions` - List transactions with extensive filtering options
- `get_single_transaction` - Get detailed transaction information
- `create_transactions` - Create new transactions
- `update_transaction` - Update existing transaction
- `unsplit_transactions` - Remove transactions from split groups
- `get_transaction_group` - Get transaction group details
- `create_transaction_group` - Create a transaction group
- `delete_transaction_group` - Delete a transaction group

### Recurring Items Tools

- `get_recurring_items` - List recurring items for a date range

### Budget Tools

- `get_budget_summary` - Get budget summary by date range
- `upsert_budget` - Create or update budget amounts
- `remove_budget` - Remove budget for a category

### Asset Tools

- `get_all_assets` - List all manually-managed assets
- `create_asset` - Create a new asset
- `update_asset` - Update asset properties

### Plaid Account Tools

- `get_all_plaid_accounts` - List all connected Plaid accounts
- `trigger_plaid_fetch` - Trigger fetch of latest data from Plaid

### Crypto Tools

- `get_all_crypto` - List all cryptocurrency assets
- `update_manual_crypto` - Update balance for manually-managed crypto

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
│       ├── assets.ts
│       ├── plaid-accounts.ts
│       └── crypto.ts
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

## API Reference

The server implements the full LunchMoney API v1. For detailed API documentation, see:

- [LunchMoney API Documentation](https://lunchmoney.dev/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License
