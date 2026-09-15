import { PlatformProvider, FreePortOptions, FreePortResult, PortInfo, ProcessInfo } from './types';

const CRITICAL_SYSTEM_PROCESSES = new Set([
  'system',
  'system idle process',
  'init',
  'systemd',
  'launchd',
  'csrss.exe',
  'lsass.exe',
  'services.exe',
  'smss.exe',
  'winlogon.exe',
  'wininit.exe',
  'kernel_task',
]);

export class SafetyManager {
  constructor(private provider: PlatformProvider) {}

  public isCriticalProcess(processName?: string | null, pid?: number | null): boolean {
    if (pid !== null && pid !== undefined) {
      if (pid <= 4 && pid >= 0) return true; // System Idle (0) and System (4) on Windows, init (1)
    }
    if (!processName) return false;
    return CRITICAL_SYSTEM_PROCESSES.has(processName.toLowerCase());
  }

  /**
   * Safely frees a port:
   * 1. Inspects current socket status
   * 2. Identifies process and checks if critical
   * 3. Sends termination signal
   * 4. Polls socket state until port is verified free
   */
  public async freePort(port: number, options: FreePortOptions = {}): Promise<FreePortResult> {
    const existing = await this.provider.findPort(port);
    if (!existing) {
      return {
        success: true,
        port,
        pid: null,
        processName: null,
        freed: true,
        alreadyFree: true,
        message: `Port ${port} is already free.`
      };
    }

    const pid = existing.pid;
    const processName = existing.processName;

    if (!pid) {
      return {
        success: false,
        port,
        pid: null,
        processName,
        freed: false,
        message: `Port ${port} is active, but its owning PID could not be determined. Elevated permissions may be required.`
      };
    }

    if (this.isCriticalProcess(processName, pid)) {
      return {
        success: false,
        port,
        pid,
        processName,
        freed: false,
        message: `Safety Block: Cannot terminate protected system process '${processName || 'PID ' + pid}'. Operation aborted.`
      };
    }

    // Step 1: Attempt termination
    const killed = await this.provider.killProcess(pid, options.force ?? false);
    if (!killed) {
      return {
        success: false,
        port,
        pid,
        processName,
        freed: false,
        message: `Failed to terminate process ${processName || ''} (PID ${pid}). Access may be denied.`
      };
    }

    // Step 2: Actively verify that port is freed by polling
    const timeoutMs = options.timeoutMs ?? 3000;
    const intervalMs = 150;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      const check = await this.provider.findPort(port);
      if (!check) {
        // Port verified to be free!
        return {
          success: true,
          port,
          pid,
          processName,
          freed: true,
          message: `Port ${port} successfully freed (process ${processName || ''} PID ${pid} terminated and verified).`
        };
      }
    }

    // If still bound after timeout and force was not used, try force kill if requested
    if (!options.force) {
      return {
        success: false,
        port,
        pid,
        processName,
        freed: false,
        message: `Process PID ${pid} was signaled, but Port ${port} is still occupied. Try with --force.`
      };
    }

    return {
      success: false,
      port,
      pid,
      processName,
      freed: false,
      message: `Port ${port} is still bound after process termination attempt.`
    };
  }
}
