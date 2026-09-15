# Changelog

All notable changes to PortWatch will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-15

### Added
- Core system abstraction layer with `PortProvider`, `ProcessProvider`, `PlatformProvider`.
- Cross-platform native platform providers for Windows (`WindowsPortProvider`), macOS (`MacOSPortProvider`), and Linux (`LinuxPortProvider`).
- Smart project detection from working directory, `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, and process command-line arguments.
- Safe process termination and port freeing with verification (`portwatch free <port>`):
  - Pre-inspection and safety confirmation display.
  - Graceful termination first, with configurable timeout.
  - Active network table polling to verify port release before reporting success.
- First-class CLI suite with commands:
  - `portwatch` / `portwatch list`: Interactive or formatted list of active ports.
  - `portwatch find <port>`: Pinpoint process, PID, executable, and project using a port.
  - `portwatch kill <port>`: Terminate process holding a port with confirmation.
  - `portwatch free <port>`: Safely terminate and verify release.
  - `portwatch inspect <pid>`: Detailed process telemetry, environment, and process tree.
  - `portwatch watch`: Continuous live port monitoring with event diffs.
  - `portwatch doctor`: Diagnostics report verifying OS capabilities and socket access.
- Structured output support with `--json` and `--csv` flags, with predictable exit codes (0 to 5).
- Premium Web & Desktop UI (React, TypeScript, Vite, Tailwind CSS, Lucide icons):
  - High-density dark-mode port overview table with real-time refresh.
  - Slide-out right-side Detail Drawer with Port, Process, Project, and Process Tree views.
  - Command Palette (`Cmd/Ctrl+K` or `/`) with quick search and actions.
  - Live Watch Mode with real-time socket events stream.
  - Project Grouping view clustering ports by detected project.
  - Port History timeline with clear history capability.
  - Safety confirmation modals with full process command line and directory previews.
  - Keyboard shortcuts (`R`, `K`, `F`, `W`, `Esc`, `?`).
- Full Rust implementation under `crates/portwatch-core` and `crates/portwatch-cli`.
- Comprehensive test suite covering port parsing, project detection, safety verification, and CLI argument handling.
