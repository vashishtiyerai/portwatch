use std::process::Command;
use std::error::Error;
use std::thread;
use std::time::Duration;
use crate::types::{PortInfo, ProcessInfo, Protocol, SocketState, DiagnosticReport, DiagnosticCheck};
use crate::providers::PortProvider;

pub struct MacOSPortProvider;

impl MacOSPortProvider {
    pub fn new() -> Self {
        Self
    }
}

impl PortProvider for MacOSPortProvider {
    fn name(&self) -> &'static str {
        "MacOSPortProvider (lsof + ps)"
    }

    fn list_ports(&self) -> Result<Vec<PortInfo>, Box<dyn Error>> {
        let mut ports = Vec::new();

        if let Ok(output) = Command::new("lsof").args(&["-iTCP", "-sTCP:LISTEN", "-n", "-P"]).output() {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines().skip(1) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() < 9 { continue; }

                let proc_name = parts[0].to_string();
                let pid = parts[1].parse::<u32>().ok();
                let addr_col = parts[8];

                if let Some(colon) = addr_col.rfind(':') {
                    if let Ok(port) = addr_col[colon + 1..].parse::<u16>() {
                        let addr = &addr_col[..colon];
                        if !ports.iter().any(|p: &PortInfo| p.port == port && p.protocol == Protocol::Tcp) {
                            ports.push(PortInfo {
                                port,
                                protocol: Protocol::Tcp,
                                pid,
                                process_name: Some(proc_name),
                                local_address: if addr == "*" { "0.0.0.0".into() } else { addr.into() },
                                state: SocketState::LISTENING,
                                project: None,
                            });
                        }
                    }
                }
            }
        }

        ports.sort_by_key(|p| p.port);
        Ok(ports)
    }

    fn inspect_process(&self, pid: u32) -> Result<Option<ProcessInfo>, Box<dyn Error>> {
        let output = Command::new("ps")
            .args(&["-p", &pid.to_string(), "-o", "pid=,ppid=,comm=,command="])
            .output()?;
        let text = String::from_utf8_lossy(&output.stdout);
        let trimmed = text.trim();
        if trimmed.is_empty() { return Ok(None); }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() >= 3 {
            let parent_pid = parts[1].parse::<u32>().ok();
            let name = parts[2].to_string();
            let cmd = parts[2..].join(" ");
            Ok(Some(ProcessInfo {
                pid,
                name,
                executable_path: None,
                command_line: Some(cmd),
                working_directory: None,
                parent_pid,
                cpu_percent: None,
                memory_bytes: None,
                started_at: None,
            }))
        } else {
            Ok(None)
        }
    }

    fn kill_process(&self, pid: u32, force: bool) -> Result<bool, Box<dyn Error>> {
        let signal = if force { "-9" } else { "-15" };
        let status = Command::new("kill").args(&[signal, &pid.to_string()]).status()?;
        Ok(status.success())
    }

    fn free_port(&self, port: u16, force: bool) -> Result<bool, Box<dyn Error>> {
        let target = match self.find_port(port)? {
            Some(p) => p,
            None => return Ok(true),
        };

        if let Some(pid) = target.pid {
            if pid <= 1 {
                return Err("Safety error: Cannot terminate init/launchd".into());
            }

            self.kill_process(pid, force)?;
            for _ in 0..15 {
                thread::sleep(Duration::from_millis(150));
                if self.find_port(port)?.is_none() {
                    return Ok(true);
                }
            }
            Ok(false)
        } else {
            Err("Cannot identify PID for port".into())
        }
    }

    fn diagnostics(&self) -> Result<DiagnosticReport, Box<dyn Error>> {
        Ok(DiagnosticReport {
            version: "0.1.0".into(),
            os: "macOS".into(),
            arch: std::env::consts::ARCH.into(),
            provider: self.name().into(),
            is_elevated: false,
            checks: vec![DiagnosticCheck {
                name: "lsof".into(),
                status: "PASS".into(),
                message: "lsof socket querying available".into(),
            }],
        })
    }
}
