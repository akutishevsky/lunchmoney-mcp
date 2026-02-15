# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server for the LunchMoney personal finance API. Provides 29 tools across 9 domains (transactions, categories, budgets, assets, tags, recurring items, user, Plaid accounts, crypto). Uses stdio transport and is published to npm as `@akutishevsky/lunchmoney-mcp`.

## Commands

- `npm run build` — compile TypeScript and chmod the entry point
- `npm run build:mcpb` — build + package as `.mcpb` for Claude Desktop
- `npm run dev` — run with MCP Inspector (set `LUNCHMONEY_API_TOKEN` in the script first)
- `npm run format` — run Prettier on the entire codebase

No test suite exists; test via `npm run dev` with the MCP Inspector against a real LunchMoney account.

A husky pre-commit hook runs `npm run format` automatically before every commit.

## Architecture

**Entry point:** `src/index.ts` — creates `McpServer`, registers all tool modules, initializes config, connects via `StdioServerTransport`.

**Config:** `src/config.ts` — singleton initialized at startup via `initializeConfig()`. Requires `LUNCHMONEY_API_TOKEN` env var. Base URL (`https://dev.lunchmoney.app/v1`) is hardcoded. Access via `getConfig()`.

**Types:** `src/types.ts` — TypeScript interfaces matching LunchMoney API response shapes (snake_case field names).

**Tools:** `src/tools/` — one file per domain. Each exports a `register[Domain]Tools(server: McpServer)` function called from `index.ts`.

**Response format:** `src/format.ts` — uses [TOON](https://github.com/nicfontaine/toon) encoding instead of JSON for tool responses. TOON is a compact text format that reduces token count by stripping quotes and braces. Null fields are stripped before encoding to further reduce payload size.

## Tool Implementation Pattern

Every tool follows this structure:

```typescript
import { formatData } from "../format.js";

server.tool(
    "snake_case_name",
    "Description for AI",
    {
        /* Zod fields with .describe() — no z.object() wrapper */
        field: z.string().describe("Field description"),
    },
    async ({ field }) => {
        const { baseUrl, lunchmoneyApiToken } = getConfig();
        const response = await fetch(`${baseUrl}/endpoint`, {
            method: "GET",
            headers: { Authorization: `Bearer ${lunchmoneyApiToken}` },
        });
        if (!response.ok) {
            return {
                content: [
                    { type: "text", text: `Failed: ${response.statusText}` },
                ],
            };
        }
        const data = await response.json();
        return { content: [{ type: "text", text: formatData(data) }] };
    },
);
```

Key conventions:

- Tool names are `snake_case`; Zod `.describe()` is required on all parameters for AI discoverability
- All responses use `formatData()` (TOON encoding) — never raw JSON or markdown
- GET requests with optional filters use `URLSearchParams`, only appending defined values
- Tools with no parameters pass `{}` as the input schema

## Adding a New Tool

1. Add or edit the tool file in `src/tools/`
2. If new file: export `register[Domain]Tools(server)` and call it from `src/index.ts`
3. Add any new response types to `src/types.ts`
4. Add the tool entry to `manifest.json` (for DXT packaging)

## Workflow Preferences

Always execute tasks in parallel when possible. If multiple independent operations need to be performed (e.g., reading files, running searches, editing unrelated files, running builds), do them simultaneously rather than sequentially. Only run tasks sequentially when there is a dependency between them.

When unsure about something — an API, a library, a protocol, a format, or any technical concept — use web search to look it up before responding. Do not guess or speculate; verify first.
