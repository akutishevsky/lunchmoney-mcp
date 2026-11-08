# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server for the LunchMoney personal finance API (v2). Provides 65 tools across 10 domains (transactions, categories, budgets, manual accounts, tags, recurring items, user, Plaid accounts, crypto, balance history). Uses stdio transport and is published to npm as `@akutishevsky/lunchmoney-mcp`.

## Commands

- `npm run build` — compile TypeScript and chmod the entry point
- `npm run build:mcpb` — build + package as `.mcpb` for Claude Desktop
- `npm run dev` — run with MCP Inspector (set `LUNCHMONEY_API_TOKEN` in the script first)
- `npm run format` — run Prettier on the entire codebase

- `npm test` — build, then run the test suite with Node's built-in runner

Tests live in `test/*.test.mjs` and are plain ESM JavaScript, not TypeScript: `tsconfig.json` sets `rootDir: ./src`, so tests can't be compiled by the main build. They import the **compiled** output from `build/`, which is why `npm test` builds first — that also makes the run a typecheck. Shared fixtures (sandbox directories, magic-byte samples, env-var juggling) live in `test/helpers.mjs`; use them rather than rolling new ones.

Coverage is partial:

- `src/attachments.ts`, the security-sensitive path from [issue #16](https://github.com/akutishevsky/lunchmoney-mcp/issues/16) (`attachments.*.test.mjs`, `transactions.tool.test.mjs`)
- the shared validators in `src/schemas.ts` (`schemas.test.mjs`) and `formatData()` (`format.test.mjs`)
- tool-level behaviour driven through a real MCP client over an in-memory transport: spec constraints rejected before any request (`constraints.tool.test.mjs`), `custom_metadata` handling (`custom-metadata.tool.test.mjs`) and `get_supported_cryptocurrencies` search (`crypto-search.tool.test.mjs`)

None of these reach the network: tool tests either fail validation before the request or stub `globalThis.fetch`. Successful API calls are still exercised manually, via `npm run dev` with the MCP Inspector or a local MCP connection, against a real LunchMoney account — ideally a demo budget.

`npm run lint` is currently broken — `typescript-eslint` does not yet support TypeScript 7. This predates the test suite.

A husky pre-commit hook runs `npm run format` automatically before every commit.

## Architecture

**Entry point:** `src/index.ts` — creates `McpServer`, registers all tool modules, initializes config, connects via `StdioServerTransport`.

**Config:** `src/config.ts` — singleton initialized at startup via `initializeConfig()`. Requires `LUNCHMONEY_API_TOKEN` env var. Base URL (`https://api.lunchmoney.dev/v2`) is hardcoded. Access via `getConfig()`.

**Debug logging:** Set `LUNCHMONEY_DEBUG=true` to log API requests and responses (method, path, status, duration, body) to stderr. Controlled via `isDebug()` in `src/api.ts`.

**Types:** `src/types.ts` — TypeScript interfaces matching LunchMoney API response shapes (snake_case field names).

**Attachments:** `src/attachments.ts` — reads local files for `attach_file_to_transaction`. Treats `file_path` as hostile input, since it reaches the server from a model that may be acting on untrusted content. The MIME type is decided by sniffing the file's leading bytes, never by its extension or the caller's `content_type`; the optional `LUNCHMONEY_ATTACHMENTS_DIR` confines reads to one directory, enforced after `realpath`. Kept as its own module so it can be unit-tested without standing up an `McpServer`. Changes here need a matching test in `test/`.

**Tools:** `src/tools/` — one file per domain. Each exports a `register[Domain]Tools(server: McpServer)` function called from `index.ts`.

**Response format:** `src/format.ts` — uses [TOON](https://github.com/nicfontaine/toon) encoding instead of JSON for tool responses. TOON is a compact text format that reduces token count by stripping quotes and braces. Before encoding, `compact()` drops object keys that are blank (null/undefined/empty array) in every element of an array, while keeping keys that are partially present as explicit nulls. This preserves key uniformity across rows so TOON emits its compact tabular form (header once, rows as CSV) instead of a verbose repeated-key list. Primitive arrays (e.g. `tag_ids`) are joined into a single `|`-delimited scalar so they don't disqualify a row from the tabular form; arrays of objects (e.g. `children`, `files`) are left intact and compacted recursively.

## Tool Implementation Pattern

Every tool uses `server.registerTool()` with a config object containing `description`, optional `inputSchema`, and `annotations`:

```typescript
import { formatData } from "../format.js";

server.registerTool(
    "snake_case_name",
    {
        description: "Description for AI",
        inputSchema: {
            /* Zod fields with .describe() — no z.object() wrapper */
            field: z.string().describe("Field description"),
        },
        annotations: {
            readOnlyHint: true, // see annotation guide below
        },
    },
    async ({ field }) => {
        const response = await api.get(`/endpoint`);
        if (!response.ok) {
            return handleApiError(response, "Failed to do something");
        }
        return dataResponse(await response.json());
    },
);
```

In practice, prefer the shared helpers from `src/api.ts`:
`api.{get,post,put,delete,upload}` (which include retry, debug
logging, and auth), plus `dataResponse`, `successResponse`,
`handleApiError`, and `catchError`.

Key conventions:

- Tool names are `snake_case`; Zod `.describe()` is required on all parameters for AI discoverability
- All responses use `formatData()` (TOON encoding) — never raw JSON or markdown
- Error responses use `errorResponse()` and `getErrorMessage()` from `src/errors.ts`
- GET requests with optional filters use `URLSearchParams`, only appending defined values
- Tools with no parameters omit `inputSchema`

### Tool Annotations

Every tool must include an `annotations` object with exactly one of these hints:

| Annotation              | When to use                                   | Examples                                   |
| ----------------------- | --------------------------------------------- | ------------------------------------------ |
| `readOnlyHint: true`    | GET requests that only read data              | `get_transactions`, `get_user`             |
| `destructiveHint: true` | DELETE requests or irreversible operations    | `delete_category`, `force_delete_category` |
| `idempotentHint: true`  | PUT/upsert requests (same args → same result) | `update_transaction`, `upsert_budget`      |
| `idempotentHint: false` | POST requests that create new resources       | `create_transactions`, `create_asset`      |
| `openWorldHint: true`   | Triggers external systems beyond LunchMoney   | `trigger_plaid_fetch`                      |

## Adding a New Tool

1. Add or edit the tool file in `src/tools/`
2. If new file: export `register[Domain]Tools(server)` and call it from `src/index.ts`
3. Add any new response types to `src/types.ts`
4. Add the tool entry to `manifest.json` (for DXT packaging)
5. Include the appropriate `annotations` (see table above)

## Releasing

Releases publish from GitHub Actions: merging a version bump into `main` runs `.github/workflows/publish-mcp.yml`, which publishes to npm and then to the MCP Registry. Nothing is published from a local machine.

1. On a branch, bump the version in every place it lives:
    - `npm version X.Y.Z --no-git-tag-version` (updates `package.json` and `package-lock.json`)
    - `manifest.json` (`version`)
    - `server.json` (top-level `version` **and** `packages[0].version`)
2. Rename the `## [Unreleased]` heading in `CHANGELOG.md` to `## [X.Y.Z] - YYYY-MM-DD`. For a breaking release, add a "Heads up" note at the top of `README.md` like the existing ones.
3. Open a PR and merge it once the `test` check passes. The merge commit on `main` starts the publish.

How the workflow behaves:

- **npm and the MCP Registry are checked separately.** Each publish runs only if that target lacks the version, so non-release pushes to `main` no-op, and a release that reached npm but not the registry can be finished with **Actions → Publish to MCP Registry → Run workflow** (`workflow_dispatch`).
- **npm uses trusted publishing (OIDC), not a token.** There is no `NPM_TOKEN` secret. The trusted publisher on npmjs.com is tied to the filename `publish-mcp.yml` — renaming the workflow breaks npm publishing until the npm package settings are updated to match.
- **The MCP Registry publish waits for npm.** The registry validates the npm package (via `mcpName` in `package.json`), and a fresh npm version can take minutes to become visible, so the workflow polls npm first. `mcp-publisher` is downloaded with `gh release download`, because the github.com release URLs have returned 504s.

Gotchas:

- **npm never reuses a version number**, even after `npm unpublish` (4.0.0 was unpublished and shipped as 4.0.1). If a release has to be pulled, prefer `npm dist-tag add @akutishevsky/lunchmoney-mcp@<previous> latest` or `npm deprecate`, and ship the fix under a new version.
- **The `.mcpb` bundle for Claude Desktop is not part of the workflow.** Build it with `npm run build:mcpb` and attach it to a GitHub release by hand (tag `mcpb-X.Y.Z`, title `MCPB-X.Y.Z`).

## Workflow Preferences

Always execute tasks in parallel when possible. If multiple independent operations need to be performed (e.g., reading files, running searches, editing unrelated files, running builds), do them simultaneously rather than sequentially. Only run tasks sequentially when there is a dependency between them.

When unsure about something — an API, a library, a protocol, a format, or any technical concept — use web search to look it up before responding. Do not guess or speculate; verify first.
