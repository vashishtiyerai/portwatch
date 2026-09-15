import { PortInfo, ProcessInfo, ProcessTreeNode, HistoryEvent, DiagnosticReport, FreePortResult } from '../types';

const API_BASE = '/api';

export async function fetchPorts(): Promise<PortInfo[]> {
  const res = await fetch(`${API_BASE}/ports`);
  if (!res.ok) throw new Error(`Failed to fetch ports: ${res.statusText}`);
  return res.json();
}

export async function fetchPortDetails(port: number): Promise<PortInfo> {
  const res = await fetch(`${API_BASE}/ports/${port}`);
  if (!res.ok) throw new Error(`Failed to fetch port ${port}: ${res.statusText}`);
  return res.json();
}

export async function fetchProcessInspection(pid: number): Promise<{ process: ProcessInfo; tree: ProcessTreeNode | null }> {
  const res = await fetch(`${API_BASE}/inspect/${pid}`);
  if (!res.ok) throw new Error(`Failed to inspect PID ${pid}: ${res.statusText}`);
  return res.json();
}

export async function freePort(port: number, force: boolean = false): Promise<FreePortResult> {
  const res = await fetch(`${API_BASE}/free/${port}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force }),
  });
  return res.json();
}

export async function fetchHistory(): Promise<HistoryEvent[]> {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) throw new Error(`Failed to fetch history: ${res.statusText}`);
  return res.json();
}

export async function clearHistory(): Promise<void> {
  await fetch(`${API_BASE}/history/clear`, { method: 'POST' });
}

export async function fetchDiagnostics(): Promise<DiagnosticReport> {
  const res = await fetch(`${API_BASE}/doctor`);
  if (!res.ok) throw new Error(`Failed to run diagnostics: ${res.statusText}`);
  return res.json();
}
