# Security Policy

## Security Principles

PortWatch interacts directly with operating system networking and process tables, and has the capability to terminate local processes upon explicit user request. Because of this, security and safety are treated with the utmost rigor.

- **Local-First & Telemetry-Free**: PortWatch operates 100% locally on your machine. It makes zero outbound network requests, sends zero telemetry or analytics, and requires no external accounts or cloud connectivity.
- **Explicit Confirmation**: Dangerous operations (such as terminating a process or freeing an occupied port) require explicit user confirmation. Silent process termination is strictly prevented.
- **Sanitized Outputs**: Diagnostic logs and process history purposefully sanitize command lines and strip sensitive environment variables.
- **Least Privilege**: PortWatch runs under the invoking user's permissions and never escalates privileges unless explicitly invoked with `sudo` or as an Administrator by the user when querying protected system sockets.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security issue or vulnerability in PortWatch, please do not file a public issue.

Instead, please send an advisory directly to the core maintainers via:
- GitHub Private Vulnerability Reporting at [github.com/portwatch/portwatch/security/advisories/new](https://github.com/portwatch/portwatch/security/advisories/new)
- Or email: `security@portwatch.dev`

Please include:
1. Steps to reproduce the issue
2. Operating system and architecture
3. Impact assessment
4. Any proposed patches or mitigations

We will acknowledge receipt within 48 hours and work with you to release a patch and disclosure timeline.
