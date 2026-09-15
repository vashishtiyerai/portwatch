use clap::{Parser, Subcommand};
use colored::*;
use portwatch_core::{get_platform_provider, PortInfo};
use std::process::exit;

#[derive(Parser)]
#[command(name = "portwatch")]
#[command(about = "Know what's using your ports. Cross-platform developer utility.", long_about = None)]
#[command(version = "0.1.0")]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,

    #[arg(short, long, global = true, help = "Output in machine-readable JSON")]
    json: bool,

    #[arg(short, long, global = true, help = "Force process kill")]
    force: bool,

    #[arg(short = 'y', long, global = true, help = "Bypass confirmation prompt")]
    yes: bool,
}

#[derive(Subcommand)]
enum Commands {
    #[command(about = "List active local listening ports")]
    List {
        #[arg(long, help = "Filter by protocol (tcp/udp)")]
        proto: Option<String>,
    },
    #[command(about = "Find process using a specific port")]
    Find {
        #[arg(help = "Port number to locate")]
        port: u16,
    },
    #[command(about = "Safely terminate process and verify port is freed")]
    Free {
        #[arg(help = "Port number to free")]
        port: u16,
    },
    #[command(about = "Kill process using a specific port")]
    Kill {
        #[arg(help = "Port number")]
        port: u16,
    },
    #[command(about = "Inspect process details and hierarchy")]
    Inspect {
        #[arg(help = "Process ID (PID)")]
        pid: u32,
    },
    #[command(about = "Run PortWatch installation and environment diagnostics")]
    Doctor,
}

fn main() {
    let cli = Cli::parse();
    let provider = get_platform_provider();

    match cli.command {
        Some(Commands::List { proto }) => {
            match provider.list_ports() {
                Ok(mut ports) => {
                    if let Some(p) = proto {
                        let filter_lower = p.to_lowercase();
                        ports.retain(|port| {
                            let s = match port.protocol {
                                portwatch_core::Protocol::Tcp => "tcp",
                                portwatch_core::Protocol::Udp => "udp",
                            };
                            s == filter_lower
                        });
                    }

                    if cli.json {
                        println!("{}", serde_json::to_string_pretty(&ports).unwrap());
                    } else {
                        print_port_table(&ports);
                    }
                    exit(0);
                }
                Err(e) => {
                    eprintln!("Error querying ports: {}", e);
                    exit(1);
                }
            }
        }
        Some(Commands::Find { port }) => {
            match provider.find_port(port) {
                Ok(Some(info)) => {
                    if cli.json {
                        println!("{}", serde_json::to_string_pretty(&info).unwrap());
                    } else {
                        println!("\nPort {} is being used by:", port.to_string().cyan().bold());
                        println!("  Process:   {}", info.process_name.unwrap_or_else(|| "Unknown".into()).bold());
                        println!("  PID:       {}", info.pid.map(|p| p.to_string()).unwrap_or_else(|| "-".into()).yellow());
                        println!("  Protocol:  {:?}", info.protocol);
                        println!("  Address:   {}", info.local_address);
                        if let Some(proj) = info.project {
                            println!("  Project:   {} ({})", proj.name.magenta(), proj.framework.unwrap_or_default());
                            println!("  Directory: {}", proj.directory.dimmed());
                        }
                        println!("\nActions:\n  portwatch free {}", port);
                    }
                    exit(0);
                }
                Ok(None) => {
                    if cli.json {
                        println!("{{\"found\": false, \"port\": {}}}", port);
                    } else {
                        println!("Port {} is free (no active process listening).", port);
                    }
                    exit(3); // Port not found
                }
                Err(e) => {
                    eprintln!("Error finding port {}: {}", port, e);
                    exit(1);
                }
            }
        }
        Some(Commands::Free { port }) | Some(Commands::Kill { port }) => {
            match provider.free_port(port, cli.force) {
                Ok(true) => {
                    println!("{} Port {} freed successfully.", "✓".green().bold(), port);
                    exit(0);
                }
                Ok(false) => {
                    eprintln!("{} Failed to free port {}. Process may still be bound.", "✗".red(), port);
                    exit(5);
                }
                Err(e) => {
                    eprintln!("{} Error freeing port {}: {}", "✗".red(), port, e);
                    exit(5);
                }
            }
        }
        Some(Commands::Inspect { pid }) => {
            match provider.inspect_process(pid) {
                Ok(Some(info)) => {
                    if cli.json {
                        println!("{}", serde_json::to_string_pretty(&info).unwrap());
                    } else {
                        println!("\nProcess PID {}:", pid.to_string().yellow().bold());
                        println!("  Name: {}", info.name.bold());
                        if let Some(cmd) = info.command_line {
                            println!("  Command: {}", cmd.dimmed());
                        }
                    }
                    exit(0);
                }
                Ok(None) => {
                    eprintln!("Process with PID {} not found.", pid);
                    exit(3);
                }
                Err(e) => {
                    eprintln!("Error inspecting PID {}: {}", pid, e);
                    exit(1);
                }
            }
        }
        Some(Commands::Doctor) => {
            match provider.diagnostics() {
                Ok(report) => {
                    if cli.json {
                        println!("{}", serde_json::to_string_pretty(&report).unwrap());
                    } else {
                        println!("PortWatch Diagnostics");
                        println!("─────────────────────");
                        println!("Version:  {}", report.version);
                        println!("OS:       {} ({})", report.os, report.arch);
                        println!("Provider: {}", report.provider);
                        println!("\nChecks:");
                        for check in report.checks {
                            println!("  [{}] {}: {}", check.status.green(), check.name, check.message);
                        }
                    }
                    exit(0);
                }
                Err(e) => {
                    eprintln!("Diagnostics error: {}", e);
                    exit(1);
                }
            }
        }
        None => {
            // Default: list
            match provider.list_ports() {
                Ok(ports) => {
                    if cli.json {
                        println!("{}", serde_json::to_string_pretty(&ports).unwrap());
                    } else {
                        print_port_table(&ports);
                    }
                    exit(0);
                }
                Err(e) => {
                    eprintln!("Error: {}", e);
                    exit(1);
                }
            }
        }
    }
}

fn print_port_table(ports: &[PortInfo]) {
    if ports.is_empty() {
        println!("No active listening sockets found.");
        return;
    }

    println!("{:<8}   {:<6}   {:<20}   {:<8}   {:<18}   {:<14}   {:<20}",
        "PORT".bold(),
        "PROTO".bold(),
        "PROCESS".bold(),
        "PID".bold(),
        "ADDRESS".bold(),
        "STATUS".bold(),
        "PROJECT".bold()
    );
    println!("{}", "─".repeat(105).dimmed());

    for p in ports {
        let port_raw = format!("{:<8}", p.port);
        let proto_raw = format!("{:<6}", match p.protocol {
            portwatch_core::Protocol::Tcp => "TCP",
            portwatch_core::Protocol::Udp => "UDP",
        });
        let proc_raw = format!("{:<20}", p.process_name.as_deref().unwrap_or("-"));
        let pid_raw = format!("{:<8}", p.pid.map(|pid| pid.to_string()).unwrap_or_else(|| "-".into()));
        let addr_raw = format!("{:<18}", p.local_address);
        let status_raw = format!("{:<14}", format!("● {:?}", p.state));
        let proj_raw = format!("{:<20}", p.project.as_ref().map(|proj| format!("{} ({})", proj.name, proj.framework.as_deref().unwrap_or(""))).unwrap_or_else(|| "-".into()));

        println!("{}   {}   {}   {}   {}   {}   {}",
            port_raw.cyan().bold(),
            proto_raw.dimmed(),
            proc_raw.bold(),
            pid_raw.yellow(),
            addr_raw.dimmed(),
            status_raw.green(),
            proj_raw.magenta()
        );
    }
}
