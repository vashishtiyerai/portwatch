use std::error::Error;
use crate::types::{PortInfo, ProcessInfo, DiagnosticReport, DiagnosticCheck};
use crate::providers::PortProvider;

pub struct FallbackPortProvider;

impl FallbackPortProvider {
    pub fn new() -> Self {
        Self
    }
}

impl PortProvider for FallbackPortProvider {
    fn name(&self) -> &'static str {
        "FallbackPortProvider"
    }

    fn list_ports(&self) -> Result<Vec<PortInfo>, Box<dyn Error>> {
        Ok(Vec::new())
    }

    fn inspect_process(&self, _pid: u32) -> Result<Option<ProcessInfo>, Box<dyn Error>> {
        Ok(None)
    }

    fn kill_process(&self, _pid: u32, _force: bool) -> Result<bool, Box<dyn Error>> {
        Ok(false)
    }

    fn free_port(&self, _port: u16, _force: bool) -> Result<bool, Box<dyn Error>> {
        Ok(false)
    }

    fn diagnostics(&self) -> Result<DiagnosticReport, Box<dyn Error>> {
        Ok(DiagnosticReport {
            version: "0.1.0".into(),
            os: "Unknown".into(),
            arch: std::env::consts::ARCH.into(),
            provider: self.name().into(),
            is_elevated: false,
            checks: vec![DiagnosticCheck {
                name: "Fallback".into(),
                status: "WARN".into(),
                message: "Operating in fallback mode".into(),
            }],
        })
    }
}
