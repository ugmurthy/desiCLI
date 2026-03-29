# desi CLI — Architecture & Design Specification

## 1. Overview

A Bun-based CLI tool that wraps the `desiClient` SDK to provide terminal access to the desiBackend API. The CLI follows the **noun-verb** (resource-action) command pattern used by tools like `gh`, `docker`, and `kubectl`.

```
desi auth login
desi dags list
desi executions get <id>
```

---

## 2. Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Runtime | **Bun** | Already in use; fast startup for CLI |
| Arg parsing | **Commander.js** | Most adopted, excellent subcommand support, auto-help, TypeScript types |
| Interactive prompts | **@clack/prompts** | Beautiful terminal UI, lightweight, modern ESM |
| Output formatting | **chalk** (color) + built-in `console.table` | Minimal deps, Bun-compatible |
| Spinners | **ora** | De-facto standard for async operation feedback |
| API client | **desiClient** (local) | Already a dependency |
| Config storage | **JSON file** at `~/.desi/config.json` | Simple, human-readable |
| Credential storage | **JSON file** at `~/.desi/credentials.json` | File-permission protected (0600) |

---

## 3. Project Structure

```
CLI/
├── index.ts                  # Entry point, registers top-level commands
├── package.json
├── tsconfig.json
│
├── src/
│   ├── commands/             # One file per resource group
│   │   ├── auth.ts           # login, signup, logout, whoami, api-keys
│   │   ├── dags.ts           # list, create, execute, get, delete, resume
│   │   ├── executions.ts     # list, get, details, events, steps, resume
│   │   ├── agents.ts         # list, create, get, update, delete, activate
│   │   ├── tools.ts          # list
│   │   ├── costs.ts          # summary, by-dag, by-execution
│   │   ├── billing.ts        # usage, history, invoices
│   │   ├── admin.ts          # tenants CRUD
│   │   └── misc.ts           # health, artifacts
│   │
│   ├── core/
│   │   ├── config.ts         # ConfigManager — read/write ~/.desi/config.json
│   │   ├── credentials.ts    # TokenStore — read/write/clear token
│   │   ├── client.ts         # getClient() — factory for ApiClient with stored token
│   │   ├── output.ts         # OutputFormatter — table/json/plain rendering
│   │   └── errors.ts         # Centralized error handler (Axios → user-friendly)
│   │
│   └── utils/
│       └── prompts.ts        # Reusable prompt wrappers (confirm, password, etc.)
│
└── test/                     # Tests (bun test)
```

---

## 4. Command Design

### 4.1 Naming Convention

```
desi <resource> <action> [args] [--flags]
```

Resources map 1:1 to desiClient services:

| Command Group | Subcommands | Auth Required |
|---------------|-------------|---------------|
| `auth` | `signup`, `login`, `logout`, `whoami`, `api-keys list`, `api-keys create`, `api-keys delete` | signup/login: No; rest: Yes |
| `dags` | `list`, `create`, `execute`, `get <id>`, `update <id>`, `delete <id>`, `resume <id>` | Yes |
| `executions` | `list`, `get <id>`, `details <id>`, `events <id>`, `steps <id>`, `resume <id>`, `delete <id>` | Yes |
| `agents` | `list`, `create`, `get <id>`, `update <id>`, `delete <id>`, `activate <id>`, `resolve <name>` | Yes |
| `tools` | `list` | Yes |
| `costs` | `summary`, `my-summary`, `dag <id>`, `execution <id>` | Yes |
| `billing` | `usage`, `history`, `invoices`, `invoice <id>` | Yes |
| `admin` | `tenants list`, `tenants create`, `tenants get <id>`, `tenants update <id>`, `tenants delete <id>` | Yes (admin) |
| `health` | *(no subcommand)*, `ready` | No |
| `artifacts` | `list`, `get --path <path>` | Yes |

### 4.2 Global Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--output <format>` | `-o` | Output format: `table` (default), `json`, `plain` |
| `--profile <name>` | `-p` | Use a named profile from config |
| `--api-url <url>` | | Override API base URL |
| `--token <token>` | | Override stored token |
| `--no-color` | | Disable colored output |
| `--verbose` | `-v` | Show debug info (request/response) |
| `--version` | `-V` | Print CLI version |
| `--help` | `-h` | Show help |

---

## 5. Core Modules

### 5.1 ConfigManager (`src/core/config.ts`)

Manages `~/.desi/config.json`:

```jsonc
{
  "defaultProfile": "default",
  "profiles": {
    "default": {
      "apiUrl": "http://localhost:3000",
      "tenantSlug": "my-org",
      "output": "table"
    },
    "production": {
      "apiUrl": "https://api.desi.example.com",
      "tenantSlug": "prod-org"
    }
  }
}
```

Key methods:
- `load(): Config` — read or create default
- `save(config: Config): void`
- `getProfile(name?: string): Profile` — resolve active profile
- `setProfile(name: string, profile: Profile): void`

### 5.2 TokenStore (`src/core/credentials.ts`)

Manages `~/.desi/credentials.json` with `0600` permissions:

```jsonc
{
  "default": {
    "token": "eyJ...",
    "email": "user@example.com",
    "expiresAt": "2025-06-01T00:00:00Z"
  }
}
```

Key methods:
- `getToken(profile?: string): string | null`
- `saveToken(token: string, email: string, profile?: string): void`
- `clearToken(profile?: string): void`

### 5.3 Client Factory (`src/core/client.ts`)

```typescript
export function getClient(opts?: { token?: string; apiUrl?: string; profile?: string }): ApiClient
```

Resolution order for token:
1. `--token` flag (highest priority)
2. `DESI_API_TOKEN` env var
3. Stored credential for active profile

Resolution order for API URL:
1. `--api-url` flag
2. `DESI_BACKEND_URL` env var
3. Profile config
4. Default: `http://localhost:3000`

### 5.4 OutputFormatter (`src/core/output.ts`)

```typescript
export function render(data: unknown, format: 'table' | 'json' | 'plain'): void
```

- **table**: Columnar output for lists, key-value for single objects
- **json**: Pretty-printed `JSON.stringify(data, null, 2)`
- **plain**: Minimal, script-friendly (one value per line, tab-separated)

### 5.5 Error Handler (`src/core/errors.ts`)

Catches Axios errors and maps to user-friendly messages:

| HTTP Status | CLI Message |
|-------------|-------------|
| 401 | `Not authenticated. Run: desi auth login` |
| 403 | `Permission denied. You may need admin access.` |
| 404 | `Resource not found.` |
| 422 | `Validation error: <field details>` |
| 429 | `Rate limited. Retry after <n> seconds.` |
| 500+ | `Server error. Try again later.` |
| Network | `Cannot reach server at <url>. Is it running?` |

---

## 6. Auth Flow

### 6.1 Signup

```
desi auth signup
```

Interactive flow:
1. Prompt: tenant slug (or `--tenant` flag)
2. Prompt: name, email, password
3. Call `client.auth.register()`
4. Print success + "Check your email to verify"

### 6.2 Login

```
desi auth login [--tenant <slug>]
```

Interactive flow:
1. Prompt: tenant slug (if not provided or stored)
2. Prompt: email and password (password masked)
3. Call `client.auth.login()`
4. Store returned token via TokenStore
5. Store tenant slug in profile config
6. Print `✓ Logged in as <email>`

### 6.3 Token-based Auth (Non-Interactive)

For CI/scripts, support:
```bash
export DESI_API_TOKEN=<token>
desi dags list
# or
desi dags list --token <token>
```

### 6.4 Whoami

```
desi auth whoami
```
Calls `client.auth.getMe()` and displays user info.

---

## 7. Command Implementation Pattern

Every command follows this pattern:

```typescript
import { Command } from 'commander';
import { getClient } from '../core/client.js';
import { render } from '../core/output.js';
import { handleError } from '../core/errors.js';

export function registerDagsCommands(program: Command) {
  const dags = program.command('dags').description('Manage DAGs');

  dags
    .command('list')
    .description('List all DAGs')
    .option('--limit <n>', 'Max results', '20')
    .option('--offset <n>', 'Skip results', '0')
    .action(async (opts) => {
      try {
        const client = getClient(program.opts());
        const result = await client.dags.list({
          limit: opts.limit,
          offset: opts.offset,
        });
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  dags
    .command('create')
    .description('Create a DAG from a goal')
    .requiredOption('--goal <text>', 'Goal text')
    .option('--agent <name>', 'Agent name')
    .option('--temperature <n>', 'Temperature', '0.7')
    .action(async (opts) => {
      try {
        const client = getClient(program.opts());
        const result = await client.dags.create({
          body: {
            goalText: opts.goal,
            agentName: opts.agent,
            temperature: parseFloat(opts.temperature),
          },
        });
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  // ... more subcommands
}
```

---

## 8. UX Conventions

### 8.1 Feedback

| Situation | UX |
|-----------|-----|
| Async API call | Spinner via `ora` ("Fetching DAGs...") |
| Success (mutation) | `✓ <action> successful` in green |
| Success (query) | Render data in chosen format |
| Destructive action | Confirm prompt unless `--yes` / `-y` flag |
| No results | `No <resource> found.` (not an error) |

### 8.2 Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error / API error |
| 2 | Invalid usage / missing args |

### 8.3 Pagination

For list commands, support `--limit` and `--offset` flags. Display pagination info:
```
Showing 1-20 of 142 results. Use --offset 20 to see more.
```

---

## 9. Implementation Plan (Phases)

### Phase 1 — Scaffold & Auth ✦ Start Here
1. Install deps: `commander`, `chalk`, `ora`, `@clack/prompts`
2. Create `src/core/` modules: config, credentials, client factory, output, errors
3. Create entry point with global flags
4. Implement `auth` commands: login, signup, logout, whoami
5. Implement `health` command (no auth, good for testing)

### Phase 2 — Primary Resources
6. Implement `dags` commands (list, create, get, execute, delete)
7. Implement `executions` commands (list, get, details, events, steps)
8. Implement `agents` commands

### Phase 3 — Secondary Resources
9. Implement `tools`, `costs`, `billing` commands
10. Implement `artifacts` commands

### Phase 4 — Admin & Polish
11. Implement `admin` commands
12. Add `--verbose` debug logging
13. Add shell completion (Commander.js supports this)
14. Add `desi config` commands for profile management
15. Add `bun build --compile` for standalone binary distribution

---

## 10. Example User Sessions

### First-time setup
```bash
$ desi auth signup
? Tenant slug: my-org
? Your name: Alice
? Email: alice@example.com
? Password: ********
✓ Account created! Check alice@example.com to verify.

$ desi auth login --tenant my-org
? Email: alice@example.com
? Password: ********
✓ Logged in as alice@example.com
  Token saved to ~/.desi/credentials.json
```

### Day-to-day usage
```bash
$ desi dags list
┌─────┬──────────────────────────┬──────────┬─────────────────────┐
│ ID  │ Goal                     │ Status   │ Created             │
├─────┼──────────────────────────┼──────────┼─────────────────────┤
│ d1  │ Compare cloud providers  │ complete │ 2025-03-10 14:22    │
│ d2  │ Write API documentation  │ running  │ 2025-03-12 09:15    │
└─────┴──────────────────────────┴──────────┴─────────────────────┘
Showing 1-2 of 2 results.

$ desi dags create --goal "Analyze competitor pricing"
⠋ Creating DAG...
✓ DAG created: d3

$ desi executions get d3-exec-1 -o json
{
  "id": "d3-exec-1",
  "status": "running",
  ...
}

$ desi costs my-summary
┌──────────────┬──────────┐
│ Metric       │ Value    │
├──────────────┼──────────┤
│ Total Cost   │ $12.34   │
│ Executions   │ 47       │
│ Period       │ Mar 2025 │
└──────────────┴──────────┘
```

### CI/Script usage
```bash
export DESI_API_TOKEN=sk-abc123
export DESI_BACKEND_URL=https://api.desi.prod.com

desi dags create --goal "Nightly report" -o json | jq '.id'
```
