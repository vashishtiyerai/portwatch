import { PlatformProvider, DiagnosticReport } from './types';

export class DoctorService {
  constructor(private provider: PlatformProvider) {}

  public async runDiagnostics(): Promise<DiagnosticReport> {
    const report = await this.provider.getDiagnostics();

    // Perform an active end-to-end sanity check
    try {
      const ports = await this.provider.listPorts();
      report.checks.push({
        name: 'Active Port Scan',
        status: 'PASS',
        message: `Successfully detected ${ports.length} listening/established ports`,
        details: `Found sample ports: ${ports.slice(0, 5).map(p => p.port).join(', ') || 'none'}`
      });

      // Try inspecting the first port with a PID if present
      const firstWithPid = ports.find(p => p.pid !== null && p.pid > 0);
      if (firstWithPid && firstWithPid.pid) {
        const inspectResult = await this.provider.inspect(firstWithPid.pid);
        if (inspectResult) {
          report.checks.push({
            name: 'Process Inspection',
            status: 'PASS',
            message: `Successfully inspected PID ${firstWithPid.pid} (${inspectResult.name})`,
            details: inspectResult.executablePath || 'executable path resolved'
          });
        }
      }
    } catch (err: any) {
      report.checks.push({
        name: 'Active Port Scan',
        status: 'FAIL',
        message: `Sanity check scan failed: ${err.message}`
      });
    }

    return report;
  }

  public formatReport(report: DiagnosticReport): string {
    const lines: string[] = [];
    lines.push('PortWatch Diagnostics');
    lines.push('─'.repeat(40));
    lines.push(`Version:       ${report.version}`);
    lines.push(`OS:            ${report.os}`);
    lines.push(`Platform:      ${report.platform} (${report.arch})`);
    lines.push(`Provider:      ${report.providerName}`);
    lines.push(`Permissions:   ${report.isElevated ? 'Elevated (Administrator/Root)' : 'Standard User'}`);
    lines.push(`Timestamp:     ${report.timestamp}`);
    lines.push('');
    lines.push('System Checks:');

    for (const check of report.checks) {
      const statusIcon = check.status === 'PASS' ? '✓ PASS' : (check.status === 'WARN' ? '⚠ WARN' : '✗ FAIL');
      lines.push(`  [${statusIcon}] ${check.name}: ${check.message}`);
      if (check.details) {
        lines.push(`           Details: ${check.details}`);
      }
    }

    lines.push('─'.repeat(40));
    lines.push('No sensitive personal information or environment tokens included.');
    return lines.join('\n');
  }
}
