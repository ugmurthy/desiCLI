# desi CLI

A Bun-based CLI for the desiBackend API. Uses a **noun-verb** command pattern:

```
desi <resource> <action> [args] [--flags]
```

## Install

### From Source

```bash
bun install
```

### Standalone Binary

```bash
# Auto-detect platform
./install.sh

# Or build manually
bun run build              # current platform
bun run build:mac          # macOS ARM64
bun run build:linux        # Linux x86_64
```

The compiled binary is written to `dist/desi` and can be copied anywhere on your `$PATH`.

## Run

```bash
# Via Bun
bun run index.ts <command>

# Via compiled binary
desi <command>
```

## Commands

| Command | Description |
|---------|-------------|
| `auth` | Signup, login, logout, whoami, API key management |
| `health` | Check API server health and readiness |
| `dags` | List, create, get, execute, update, delete, resume DAGs |
| `executions` | List, get, details, events, steps, resume, delete executions |
| `agents` | List, create, get, update, delete, activate, resolve agents |
| `tools` | List available tools |
| `costs` | View cost summary, per-DAG and per-execution costs |
| `billing` | Usage, history, invoices |
| `artifacts` | List and download artifacts |
| `admin` | Tenant management (admin only) |
| `config` | Manage CLI profiles |
| `completion` | Generate shell completion scripts (bash, zsh, fish) |

## Global Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--output <format>` | `-o` | `table` (default), `json`, or `plain` |
| `--profile <name>` | `-p` | Use a named profile |
| `--api-url <url>` | | Override API base URL |
| `--token <token>` | | Override stored auth token |
| `--no-color` | | Disable colored output |
| `--verbose` | `-v` | Show debug info |
| `--version` | `-V` | Print CLI version |

## Quick Start

```bash
# Login
desi auth login --tenant my-org

# List DAGs
desi dags list

# Create and execute a DAG
desi dags create --goal "Analyze competitor pricing"
desi dags execute <dag-id>

# Check costs
desi costs my-summary

# Download an artifact
desi artifacts get report.pdf ./downloads
```

## Shell Completion

```bash
# Bash — add to ~/.bashrc
eval "$(desi completion bash)"

# Zsh — add to ~/.zshrc
eval "$(desi completion zsh)"

# Fish — save to completions directory
desi completion fish > ~/.config/fish/completions/desi.fish
```

## CI / Non-Interactive Usage

```bash
export DESI_API_TOKEN=<token>
export DESI_BACKEND_URL=https://api.desi.example.com

desi dags list -o json
```

## Configuration

Stored in `~/.desi/config.json` (profiles) and `~/.desi/credentials.json` (tokens).

Manage profiles with:

```bash
desi config list           # List profiles
desi config set <key> <value>  # Set a profile value
```
