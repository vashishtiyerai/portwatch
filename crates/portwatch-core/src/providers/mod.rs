pub mod windows;
pub mod macos;
pub mod linux;
pub mod fallback;

use std::error::Error;
use crate::types::{PortInfo, ProcessInfo, DiagnosticReport};

pub trait PortProvider: Send + Sync {
    fn name(&self) -> &'static str;
    fn list_ports(&self) -> Result<Vec<PortInfo>, Box<dyn Error>>;
    fn find_port(&self, port: u16) -> Result<Option<PortInfo>, Box<dyn Error>> {
        let ports = self.list_ports()?;
        Ok(ports.into_iter().find(|p| p.port == port))
    }
    fn inspect_process(&self, pid: u32) -> Result<Option<ProcessInfo>, Box<dyn Error>>;
    fn kill_process(&self, pid: u32, force: bool) -> Result<bool, Box<dyn Error>>;
    fn free_port(&self, port: u16, force: bool) -> Result<bool, Box<dyn Error>>;
    fn diagnostics(&self) -> Result<DiagnosticReport, Box<dyn Error>>;
}

pub fn get_platform_provider() -> Box<dyn PortProvider> {
    #[cfg(target_os = "windows")]
    {
        Box::new(windows::WindowsPortProvider::new())
    }
    #[cfg(target_os = "macos")]
    {
        Box::new(macos::MacOSPortProvider::new())
    }
    #[cfg(target_os = "linux")]
    {
        Box::new(linux::LinuxPortProvider::new())
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Box::new(fallback::FallbackPortProvider::new())
    }
}
