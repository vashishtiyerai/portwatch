use std::path::Path;
use std::fs;
use crate::types::{ProcessInfo, ProjectInfo};

pub fn identify_project(proc: &ProcessInfo) -> Option<ProjectInfo> {
    let cwd = proc.working_directory.as_deref();
    let cmd = proc.command_line.as_deref().unwrap_or("");
    let name = proc.name.to_lowercase();

    // Check standalone services
    if name.contains("postgres") {
        return Some(ProjectInfo {
            name: "PostgreSQL".into(),
            directory: cwd.unwrap_or("System").into(),
            framework: Some("Database".into()),
            detected_from: "executable".into(),
        });
    }
    if name.contains("redis") {
        return Some(ProjectInfo {
            name: "Redis".into(),
            directory: cwd.unwrap_or("System").into(),
            framework: Some("In-Memory Store".into()),
            detected_from: "executable".into(),
        });
    }
    if name.contains("ollama") {
        return Some(ProjectInfo {
            name: "Ollama".into(),
            directory: cwd.unwrap_or("System").into(),
            framework: Some("LLM Service".into()),
            detected_from: "executable".into(),
        });
    }

    // Check directory manifests
    if let Some(dir_str) = cwd {
        let dir = Path::new(dir_str);
        if dir.exists() {
            let pkg_json = dir.join("package.json");
            if pkg_json.exists() {
                if let Ok(content) = fs::read_to_string(&pkg_json) {
                    let mut proj_name = dir.file_name().and_then(|n| n.to_str()).unwrap_or("Node App").to_string();
                    if let Some(caps) = content.find("\"name\":") {
                        if let Some(start) = content[caps..].find('"') {
                            let rest = &content[caps + start + 1..];
                            if let Some(end) = rest.find('"') {
                                proj_name = rest[..end].to_string();
                            }
                        }
                    }

                    let framework = if content.contains("\"next\"") {
                        Some("Next.js".into())
                    } else if content.contains("\"vite\"") {
                        Some("Vite".into())
                    } else if content.contains("\"express\"") {
                        Some("Express".into())
                    } else {
                        Some("Node.js".into())
                    };

                    return Some(ProjectInfo {
                        name: proj_name,
                        directory: dir_str.into(),
                        framework,
                        detected_from: "package_json".into(),
                    });
                }
            }

            let cargo_toml = dir.join("Cargo.toml");
            if cargo_toml.exists() {
                let name = dir.file_name().and_then(|n| n.to_str()).unwrap_or("Rust App");
                return Some(ProjectInfo {
                    name: name.into(),
                    directory: dir_str.into(),
                    framework: Some("Rust".into()),
                    detected_from: "cargo_toml".into(),
                });
            }
        }
    }

    // Check cmdline
    if cmd.contains("next dev") || cmd.contains("next start") {
        return Some(ProjectInfo {
            name: "Next.js App".into(),
            directory: cwd.unwrap_or(".").into(),
            framework: Some("Next.js".into()),
            detected_from: "command_line".into(),
        });
    }

    if cmd.contains("vite") {
        return Some(ProjectInfo {
            name: "Vite App".into(),
            directory: cwd.unwrap_or(".").into(),
            framework: Some("Vite".into()),
            detected_from: "command_line".into(),
        });
    }

    None
}
