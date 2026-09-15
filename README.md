# PortWatch

<p align="center">
  <strong>Know what's using your ports.</strong><br>
  A fast, local-first developer utility for discovering, inspecting, and managing the processes behind your local ports.
</p>

<p align="center">
  <a href="#license"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="#supported-platforms"><img src="https://img.shields.io/badge/platform-windows%20%7C%20macos%20%7C%20linux-lightgrey.svg" alt="Platforms"></a>
  <a href="https://github.com/portwatch/portwatch/releases"><img src="https://img.shields.io/badge/release-v0.1.0-emerald.svg" alt="Latest Release"></a>
</p>

---

```bash
$ portwatch find 3000

PORT   PROTO  PROCESS  PID    ADDRESS    STATE      PROJECT
3000   tcp    node     18342  127.0.0.1  LISTENING  my-next-app

Process Information:
  Command:   node server.js
  Directory: /Users/alex/projects/my-next-app
  Started:   14:22:01 (2h 14m ago)
  Memory:    142 MB

[Free Port: portwatch free 3000]  [Inspect: portwatch inspect 18342]
```

## Why PortWatch?

Developers encounter this error every day:

> `Error: listen EADDRINUSE: address already in use :::3000`

Standard developer workflow when this happens:
1. Run `lsof -i :3000` or `netstat -ano | findstr 3000`
2. Try to decipher raw network socket tables and locate the PID
3. Run `ps -p <PID>` or `tasklist` to figure out what application it is
4. Run `kill -9 <PID>` or `taskkill /F /PID <PID>`
5. Cross fingers that it actually terminated and didn't leave a child process locking the port

**PortWatch makes this instantaneous, intelligent, and safe.**

With one simple command:
```bash
portwatch free 3000
```
PortWatch inspects the owner, displays the process details, requests confirmation, terminates the process cleanly, and **verifies that the port is truly freed** before returning.

---

## Features

- ⚡ **Instant Port Discovery**: Query all active TCP and UDP listening sockets across Windows, macOS, and Linux in milliseconds.
- 🧠 **Smart Project Identification**: Automatically detects whether a port is owned by Next.js, Vite, FastAPI, PostgreSQL, Ollama, Docker, or your own repository by inspecting working directories, `package.json`, `Cargo.toml`, and process trees.
- 🛡️ **Safe Process Termination**: Never accidentally kill an unknown system daemon. PortWatch previews process commands and working directories, sends graceful termination signals first, and polls the network socket table to verify the port was freed.
- 🌲 **Process Tree Inspection**: View parent and child process trees to understand what launched the offending process (`npm -> node -> vite -> esbuild`).
- 📡 **Live Continuous Monitoring (`watch` mode)**: Stream socket events in real time as ports open and close on your machine with minimal CPU overhead.
- 🕒 **Port History**: Lightweight, privacy-preserving local activity log to help debug ephemeral port conflicts.
- 💻 **Dual Interfaces**:
  - **First-Class CLI**: Interactive overview, high-contrast tables, `--json` / `--csv` machine-readable output, and predictable exit codes (0 to 5) for scripts.
  - **Modern Desktop / Web UI**: Premium dark-mode interface built with React, TypeScript, Tailwind CSS, Lucide icons, keyboard shortcuts (`Cmd/Ctrl+K`, `/`, `R`, `Esc`, `K`, `F`, `W`), and a slide-out Detail Drawer.
- 🔒 **100% Local & Telemetry-Free**: Zero telemetry, zero analytics, zero external network calls, zero accounts.

---

## Supported Platforms

| Platform | Supported Architecture | Native Provider |
| -------- | ---------------------- | --------------- |
| Windows  | x64, ARM64             | Win32 / NetTCPConnection / Tasklist |
| macOS    | Apple Silicon, Intel   | lsof / libproc / ps |
| Linux    | x64, ARM64             | /proc/net, ss, /proc/[pid] |

---

## Installation

### Node / npm (Universal)
```bash
# Run instantly without installation:
npx portwatch

# Or install globally:
npm install -g portwatch
```

### Rust / Cargo (Single Native Binary)
```bash
cargo install portwatch-cli
```

### Homebrew (macOS / Linux)
```bash
brew install portwatch/tap/portwatch
```

### Windows (winget)
```powershell
winget install PortWatch.PortWatch
```

---

## CLI Reference

### 1. List active ports
```bash
portwatch
# or
portwatch list
```
Displays an interactive, formatted table of all active listening ports.

Flags:
- `--json` : Output in machine-readable JSON format
- `--csv` : Output in standard CSV format
- `--proto <tcp|udp>` : Filter by protocol
- `--state <listening|all>` : Filter by socket state
- `--quiet` : Quiet mode for shell scripting

### 2. Find what is using a port
```bash
portwatch find 3000
```
Inspects port 3000, displaying process details, command-line arguments, working directory, and detected project name.

### 3. Safely free a port
```bash
portwatch free 3000
```
Shows the process details, prompts for confirmation, terminates the process, and verifies that port 3000 is open.
Use `-y` or `--yes` in automation to bypass interactive prompts.

### 4. Kill process by port
```bash
portwatch kill 3000
# Force kill immediately:
portwatch kill 3000 --force
```

### 5. Inspect a PID
```bash
portwatch inspect 18342
```
Displays in-depth process telemetry, executable path, working directory, memory usage, and the full process tree.

### 6. Live monitoring
```bash
portwatch watch
```
Monitors active ports continuously, streaming notifications whenever ports open or close:
```text
[14:45:10] + Port 5173 opened by vite (PID 21902)
[14:47:02] - Port 5173 closed
```

### 7. Environment diagnostics
```bash
portwatch doctor
```
Verifies socket enumeration, process discovery permissions, and operating system adapters. Useful for attaching to GitHub bug reports.

### 8. Exit Codes
PortWatch provides predictable exit codes for robust shell scripts and automation:
- `0`: Operation succeeded
- `1`: General runtime error
- `2`: Invalid command arguments
- `3`: Port or process not found
- `4`: Permission denied (elevation required)
- `5`: Process termination / freeing failed

---

## Desktop & Web UI

PortWatch includes a desktop and web GUI designed for developers who prefer a visual workspace alongside their terminal.

Launch the GUI anytime with:
```bash
portwatch ui
```

### UI Capabilities
- **Overview Table**: Sort, filter by protocol/state, and search across ports, PIDs, processes, and project names.
- **Detail Drawer**: Slide out full process telemetry, directory paths, environment metadata, and process hierarchy without leaving the table.
- **Command Palette (`Cmd/Ctrl+K` or `/`)**: Instant keyboard-driven navigation and actions.
- **Projects View**: Automatically clusters multiple open ports under their parent project (e.g. Next.js app + Python backend + Postgres database).
- **History Timeline**: Review recent port bindings and closures.
- **Safety Dialogs**: Clear confirmation dialogs showing exact command lines before killing processes.

---

## Architecture

PortWatch enforces a strict separation of concerns:

```text
portwatch/
│
├── crates/
│   ├── portwatch-core/     # Native Rust system providers & abstractions
│   └── portwatch-cli/      # Native CLI with clap and ratatui
│
├── packages/
│   ├── core/               # Cross-platform TypeScript engine & platform adapters
│   │   ├── src/providers/  # Windows, macOS, Linux, and Fallback providers
│   │   ├── src/project.ts  # Smart project & framework detection
│   │   ├── src/safety.ts   # Safe process termination & release verification
│   │   ├── src/history.ts  # Local activity ring buffer
│   │   └── src/doctor.ts   # System environment diagnostics
│   ├── cli/                # Terminal CLI implementation & formatters
│   ├── server/             # Local API & Server-Sent Events server
│   └── ui/                 # React 18, TypeScript, Tailwind CSS, Lucide GUI
│
├── apps/
│   └── desktop/            # Tauri desktop shell
└── tests/                  # Cross-platform unit and integration test suite
```

### Core Abstraction

All platform-specific code implements a unified interface:
```typescript
interface PortProvider {
  listPorts(): Promise<PortInfo[]>;
  findPort(port: number, protocol?: "tcp" | "udp"): Promise<PortInfo | null>;
}

interface ProcessProvider {
  inspect(pid: number): Promise<ProcessInfo | null>;
  getProcessTree(pid: number): Promise<ProcessTreeNode | null>;
  killProcess(pid: number, force?: boolean): Promise<boolean>;
}

interface PlatformProvider {
  getDiagnostics(): Promise<DiagnosticReport>;
}
```

The user interfaces (CLI, Web, and Desktop) communicate exclusively with these abstractions and never invoke raw operating system commands directly.

---

## Security & Privacy

- **Zero Telemetry**: PortWatch contains no tracking, Google Analytics, telemetry pings, or third-party cookies.
- **Local-Only**: The UI communicates strictly with `127.0.0.1` via local loopback.
- **No Silent Kills**: Terminations require explicit user confirmation unless overridden with `-y`.
- **Sanitized Diagnostics**: Diagnostic reports produced by `portwatch doctor` strip sensitive environment variables and tokens.

---

## Development

```bash
# Clone
git clone https://github.com/portwatch/portwatch.git
cd portwatch

# Install dependencies
npm install

# Build all packages
npm run build

# Run test suite
npm test

# Run the CLI
node packages/cli/bin/portwatch.js list
```

---

## Contributing

We love contributions! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before submitting a pull request.

---

## License

PortWatch is open-source software licensed under the [MIT License](LICENSE).
