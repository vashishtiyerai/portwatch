use std::process::Command;
use std::error::Error;
use std::collections::HashMap;
use std::thread;
use std::time::Duration;
use crate::types::{PortInfo, ProcessInfo, Protocol, SocketState, DiagnosticReport, DiagnosticCheck};
use crate::providers::PortProvider;
use crate::project::identify_project;

pub struct WindowsPortProvider;

impl WindowsPortProvider {
    pub fn new() -> Self {
        Self
    }

    fn get_process_map(&self) -> HashMap<u32, String> {
        let mut map = HashMap::new();
        if let Ok(output) = Command::new("tasklist").args(&["/fo", "csv", "/nh"]).output() {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() { continue; }
                let parts: Vec<&str> = trimmed.split(',').collect();
                if parts.len() >= 2 {
                    let name = parts[0].trim_matches('"').to_string();
                    let pid_str = parts[1].trim_matches('"');
                    if let Ok(pid) = pid_str.parse::<u32>() {
                        map.insert(pid, name);
                    }
                }
            }
        }
        map
    }
}

impl PortProvider for WindowsPortProvider {
    fn name(&self) -> &'static str {
        "WindowsPortProvider (netstat + tasklist)"
    }

    fn list_ports(&self) -> Result<Vec<PortInfo>, Box<dyn Error>> {
        let mut ports = Vec::new();
        let proc_map = self.get_process_map();

        let output = Command::new("netstat").arg("-ano").output()?;
        let text = String::from_utf8_lossy(&output.stdout);

        for line in text.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 4 { continue; }

            let proto_str = parts[0].to_uppercase();
            if proto_str == "TCP" && parts.len() >= 5 {
                let local_addr = parts[1];
                let state_str = parts[3].to_uppercase();
                let pid_str = parts[4];

                if let Some(colon) = local_addr.rfind(':') {
                    if let Ok(port) = local_addr[colon + 1..].parse::<u16>() {
                        let addr = &local_addr[..colon];
                        let pid = pid_str.parse::<u32>().ok();
                        let proc_name = pid.and_then(|p| proc_map.get(&p).cloned());

                        let state = match state_str.as_str() {
                            "LISTENING" => SocketState::LISTENING,
                            "ESTABLISHED" => SocketState::ESTABLISHED,
                            "CLOSE_WAIT" => SocketState::CLOSE_WAIT,
                            "TIME_WAIT" => SocketState::TIME_WAIT,
                            _ => SocketState::UNKNOWN,
                        };

                        if !ports.iter().any(|p: &PortInfo| p.port == port && p.protocol == Protocol::Tcp && p.state == state) {
                            let mut info = PortInfo {
                                port,
                                protocol: Protocol::Tcp,
                                pid,
                                process_name: proc_name.clone(),
                                local_address: addr.to_string(),
                                state,
                                project: None,
                            };

                            if let (Some(p), Some(ref name)) = (pid, proc_name.as_ref()) {
                                let proc_info = ProcessInfo {
                                    pid: p,
                                    name: name.clone(),
                                    executable_path: None,
                                    command_line: None,
                                    working_directory: None,
                                    parent_pid: None,
                                    cpu_percent: None,
                                    memory_bytes: None,
                                    started_at: None,
                                };
                                info.project = identify_project(&proc_info);
                            }

                            ports.push(info);
                        }
                    }
                }
            } else if proto_str == "UDP" && parts.len() >= 4 {
                let local_addr = parts[1];
                let pid_str = parts[parts.len() - 1];

                if let Some(colon) = local_addr.rfind(':') {
                    if let Ok(port) = local_addr[colon + 1..].parse::<u16>() {
                        let addr = &local_addr[..colon];
                        let pid = pid_str.parse::<u32>().ok();
                        let proc_name = pid.and_then(|p| proc_map.get(&p).cloned());

                        if !ports.iter().any(|p: &PortInfo| p.port == port && p.protocol == Protocol::Udp) {
                            let mut info = PortInfo {
                                port,
                                protocol: Protocol::Udp,
                                pid,
                                process_name: proc_name.clone(),
                                local_address: addr.to_string(),
                                state: SocketState::LISTENING,
                                project: None,
                            };

                            if let (Some(p), Some(ref name)) = (pid, proc_name.as_ref()) {
                                let proc_info = ProcessInfo {
                                    pid: p,
                                    name: name.clone(),
                                    executable_path: None,
                                    command_line: None,
                                    working_directory: None,
                                    parent_pid: None,
                                    cpu_percent: None,
                                    memory_bytes: None,
                                    started_at: None,
                                };
                                info.project = identify_project(&proc_info);
                            }

                            ports.push(info);
                        }
                    }
                }
            }
        }

        ports.sort_by_key(|p| p.port);
        Ok(ports)
    }

    fn inspect_process(&self, pid: u32) -> Result<Option<ProcessInfo>, Box<dyn Error>> {
        let proc_map = self.get_process_map();
        if let Some(name) = proc_map.get(&pid) {
            Ok(Some(ProcessInfo {
                pid,
                name: name.clone(),
                executable_path: None,
                command_line: None,
                working_directory: None,
                parent_pid: None,
                cpu_percent: None,
                memory_bytes: None,
                started_at: None,
            }))
        } else {
            Ok(None)
        }
    }

    fn kill_process(&self, pid: u32, force: bool) -> Result<bool, Box<dyn Error>> {
        let mut cmd = Command::new("taskkill");
        if force {
            cmd.args(&["/F", "/T"]);
        }
        cmd.args(&["/PID", &pid.to_string()]);
        let status = cmd.status()?;
        Ok(status.success())
    }

    fn free_port(&self, port: u16, force: bool) -> Result<bool, Box<dyn Error>> {
        let target = match self.find_port(port)? {
            Some(p) => p,
            None => return Ok(true), // Already free
        };

        if let Some(pid) = target.pid {
            // Guard system processes
            if pid <= 4 {
                return Err("Safety error: Cannot terminate protected system process".into());
            }

            self.kill_process(pid, force)?;

            // Poll verification
            for _ in 0..15 {
                thread::sleep(Duration::from_millis(150));
                if self.find_port(port)?.is_none() {
                    return Ok(true);
                }
            }

            // Still bound
            if !force {
                self.kill_process(pid, true)?;
                for _ in 0..10 {
                    thread::sleep(Duration::from_millis(150));
                    if self.find_port(port)?.is_none() {
                        return Ok(true);
                    }
                }
            }
            Ok(false)
        } else {
            Err("Cannot identify PID for port".into())
        }
    }

    fn diagnostics(&self) -> Result<DiagnosticReport, Box<dyn Error>> {
        let mut checks = Vec::new();

        let ports = self.list_ports()?;
        checks.push(DiagnosticCheck {
            name: "Port Enumeration".into(),
            status: "PASS".into(),
            message: format!("Discovered {} active ports via netstat", ports.len()),
        });

        let map = self.get_process_map();
        checks.push(DiagnosticCheck {
            name: "Process Table".into(),
            status: "PASS".into(),
            message: format!("Identified {} active processes via tasklist", map.len()),
        });

        Ok(DiagnosticReport {
            version: "0.1.0".into(),
            os: "Windows".into(),
            arch: std::env::consts::ARCH.into(),
            provider: self.name().into(),
            is_elevated: false,
            checks,
        })
    }
}
