export type Protocol = 'tcp' | 'udp';

export type SocketState = 
  | 'LISTENING'
  | 'ESTABLISHED'
  | 'CLOSE_WAIT'
  | 'TIME_WAIT'
  | 'SYN_SENT'
  | 'SYN_RECV'
  | 'BOUND'
  | 'UNKNOWN';

export interface ProjectInfo {
  name: string;
  directory: string;
  type: 'nodejs' | 'rust' | 'python' | 'go' | 'docker' | 'generic';
  framework?: string;
  detectedFrom: string;
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
  timestamp: string;
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
  platform: string;
  arch: string;
  providerName: string;
  isElevated: boolean;
  checks: DiagnosticItem[];
  timestamp: string;
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
