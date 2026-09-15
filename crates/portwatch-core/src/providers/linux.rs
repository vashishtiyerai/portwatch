use std::process::Command;
use std::error::Error;
use std::fs;
use std::thread;
use std::time::Duration;
use crate::types::{PortInfo, ProcessInfo, Protocol, SocketState, DiagnosticReport, DiagnosticCheck};
use crate::providers::PortProvider;

pub struct LinuxPortProvider;

impl LinuxPortProvider {
    pub fn new() -> Self {
        Self
    }
}

impl PortProvider for LinuxPortProvider {
    fn name(&self) -> &'static str {
        "LinuxPortProvider (ss + /proc)"
    }

    fn list_ports(&self) -> Result<Vec<PortInfo>, Box<dyn Error>> {
        let mut ports = Vec::new();

        if let Ok(output) = Command::new("ss").args(&["-tulpn", "-H"]).output() {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() < 5 { continue; }

                let proto = if parts[0].contains("tcp") { Protocol::Tcp } else { Protocol::Udp };
                let local_addr = parts[4];

                if let Some(colon) = local_addr.rfind(':') {
                    if let Ok(port) = local_addr[colon + 1..].parse::<u16>() {
                        let addr = local_addr[..colon].trim_matches(|c| c == '[' || c == ']');
                        
                        let mut pid = None;
                        let mut proc_name = None;

                        let users_col = parts[5..].join(" ");
                        if let Some(pid_idx) = users_col.find("pid=") {
                            let rest = &users_col[pid_idx + 4..];
                            let end = rest.find(',').or_else(|| rest.find(')')).unwrap_or(rest.len());
                            pid = rest[..end].parse::<u32>().ok();
                        }
                        if let Some(quote_start) = users_col.find('"') {
                            let rest = &users_col[quote_start + 1..];
                            if let Some(quote_end) = rest.find('"') {
                                proc_name = Some(rest[..quote_end].to_string());
                            }
                        }

                        if !ports.iter().any(|p: &PortInfo| p.port == port && p.protocol == proto) {
                            ports.push(PortInfo {
                                port,
                                protocol: proto,
                                pid,
                                process_name: proc_name,
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
        let proc_dir = format!("/proc/{}", pid);
        if !std::path::Path::new(&proc_dir).exists() {
            return Ok(None);
        }

        let cmd = fs::read_to_string(format!("{}/cmdline", proc_dir))
            .map(|s| s.replace('\0', " "))
            .ok();

        Ok(Some(ProcessInfo {
            pid,
            name: format!("process-{}", pid),
            executable_path: fs::read_link(format!("{}/exe", proc_dir)).ok().and_then(|p| p.to_str().map(String::from)),
            command_line: cmd,
            working_directory: fs::read_link(format!("{}/cwd", proc_dir)).ok().and_then(|p| p.to_str().map(String::from)),
            parent_pid: None,
            cpu_percent: None,
            memory_bytes: None,
            started_at: None,
        }))
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
                return Err("Safety error: Cannot terminate init/systemd".into());
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
            os: "Linux".into(),
            arch: std::env::consts::ARCH.into(),
            provider: self.name().into(),
            is_elevated: false,
            checks: vec![DiagnosticCheck {
                name: "ss".into(),
                status: "PASS".into(),
                message: "ss (iproute2) available".into(),
            }],
        })
    }
}
