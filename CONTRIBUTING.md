# Contributing to PortWatch

Thank you for your interest in contributing to PortWatch!

PortWatch is a cross-platform developer utility built for speed, safety, and visual elegance. We welcome contributions from developers of all skill levels.

## Repository Architecture

PortWatch uses a clean modular architecture separating the core system abstraction from the user interfaces:

```text
portwatch/
├── crates/
│   ├── portwatch-core/       # Native Rust system providers (Windows, macOS, Linux)
│   └── portwatch-cli/        # Native Rust CLI with clap and terminal formatters
├── packages/
│   ├── core/                 # Cross-platform TypeScript engine & platform adapters
│   ├── cli/                  # Modern terminal CLI (table, json, csv, watch, doctor)
│   ├── server/               # Embedded local API & Server-Sent Events (SSE) server
│   └── ui/                   # React + TypeScript + Tailwind CSS + Lucide web/desktop GUI
├── apps/
│   └── desktop/              # Tauri application shell
└── tests/                    # Unit, integration, and cross-platform verification tests
```

## Adding Platform Support

Platform-specific logic must implement the `PortProvider`, `ProcessProvider`, and `PlatformProvider` abstractions. Do not litter general application logic with OS conditionals.

Key traits / interfaces:
- `listPorts(): Promise<PortInfo[]>`
- `findPort(port: number, protocol?: "tcp" | "udp"): Promise<PortInfo | null>`
- `inspect(pid: number): Promise<ProcessInfo | null>`
- `killProcess(pid: number, force?: boolean): Promise<boolean>`
- `diagnostics(): Promise<DiagnosticReport>`

### Existing Adapters:
- `WindowsPortProvider`: Queries `Get-NetTCPConnection` / `netstat -ano`, CIM/WMI `Win32_Process`, handles PID-to-process matching and graceful/force task termination.
- `MacOSPortProvider`: Interfaces with `lsof -iTCP -sTCP:LISTEN -n -P`, `ps`, and `kill`.
- `LinuxPortProvider`: Interfaces with `/proc/net/tcp`, `/proc/net/udp`, `/proc/[pid]/`, `ss`, and `kill`.

## Development Setup

### Prerequisites
- Node.js >= 18.0.0 (or Rust >= 1.70.0 for native crate builds)
- npm or pnpm

### Quickstart (TypeScript / Web UI)
```bash
# Clone the repository
git clone https://github.com/portwatch/portwatch.git
cd portwatch

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Run CLI locally
node packages/cli/bin/portwatch.js list
node packages/cli/bin/portwatch.js find 3000
node packages/cli/bin/portwatch.js doctor

# Launch GUI in development
npm run dev:ui
```

### Quickstart (Rust Core & CLI)
```bash
# Check and test Rust crates
cargo check --workspace
cargo test --workspace

# Run CLI binary
cargo run --package portwatch-cli -- list
cargo run --package portwatch-cli -- doctor
```

## Pull Request Guidelines

1. **Focus**: Keep diffs focused and avoid unrelated refactoring.
2. **Tests**: Add unit or integration tests for new functionality or bug fixes.
3. **Safety**: Never bypass process kill confirmation mechanisms.
4. **Formatting**: Follow existing linting and formatting conventions.
5. **No Fake Data**: Production code paths must always query real operating system APIs.

## Issue Labels
- `good first issue` — Great for newcomers
- `platform:windows` — Windows-specific logic
- `platform:macos` — macOS-specific logic
- `platform:linux` — Linux-specific logic
- `cli` — Terminal CLI and formatting
- `ui` — Desktop and Web GUI
- `core` — Engine and system providers
