export type Protocol = 'tcp' | 'udp';

export type SocketState = 
  | 'LISTENING'
  | 'ESTABLISHED'
  | 'CLOSE_WAIT'
  | 'TIME_WAIT'
  | 'SYN_SENT'
  | 'SYN_RECV'
  | 'FIN_WAIT_1'
  | 'FIN_WAIT_2'
  | 'BOUND'
  | 'UNKNOWN';

export interface ProjectInfo {
  name: string;
  directory: string;
  type: 'nodejs' | 'rust' | 'python' | 'go' | 'docker' | 'generic';
  framework?: string; // e.g. "Next.js", "Vite", "FastAPI", "PostgreSQL", "Ollama"
  detectedFrom: 'package_json' | 'cargo_toml' | 'pyproject_toml' | 'go_mod' | 'working_directory' | 'command_line' | 'executable';
}

export interface PortInfo {
  port: number;
  protocol: Protocol;
  pid: number | null;
  processName: string | null;
  localAddress: string;
  state: SocketState;
  project?: ProjectInfo | null;
  uptime?: string | null;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  executablePath?: string | null;
  commandLine?: string | null;
  workingDirectory?: string | null;
  parentPid?: number | null;
  cpuPercent?: number | null;
  memoryBytes?: number | null;
  startedAt?: string | null;
  user?: string | null;
}

export interface ProcessTreeNode {
  pid: number;
  name: string;
  commandLine?: string | null;
  children: ProcessTreeNode[];
}

export interface HistoryEvent {
  id: string;
  port: number;
  protocol: Protocol;
  event: 'opened' | 'closed';
  timestamp: string; // ISO 8601
  processName?: string | null;
  pid?: number | null;
  project?: string | null;
}

export interface DiagnosticItem {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
  details?: string;
}

export interface DiagnosticReport {
  version: string;
  os: string;
  platform: NodeJS.Platform;
  arch: string;
  providerName: string;
  isElevated: boolean;
  checks: DiagnosticItem[];
  timestamp: string;
}

export interface FreePortOptions {
  force?: boolean;
  timeoutMs?: number;
  gracefulWaitMs?: number;
}

export interface FreePortResult {
  success: boolean;
  port: number;
  pid: number | null;
  processName: string | null;
  freed: boolean;
  message: string;
  alreadyFree?: boolean;
}

export interface PortProvider {
  readonly platformName: string;
  listPorts(): Promise<PortInfo[]>;
  findPort(port: number, protocol?: Protocol): Promise<PortInfo | null>;
}

export interface ProcessProvider {
  inspect(pid: number): Promise<ProcessInfo | null>;
  getProcessTree(pid: number): Promise<ProcessTreeNode | null>;
  killProcess(pid: number, force?: boolean): Promise<boolean>;
  listProcesses(): Promise<ProcessInfo[]>;
}

export interface PlatformProvider extends PortProvider, ProcessProvider {
  getDiagnostics(): Promise<DiagnosticReport>;
}

export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGUMENTS: 2,
  PORT_NOT_FOUND: 3,
  PERMISSION_DENIED: 4,
  PROCESS_ACTION_FAILED: 5,
} as const;
