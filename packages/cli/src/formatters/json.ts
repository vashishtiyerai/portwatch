import { PortInfo } from '@portwatch/core';

export function formatPortJson(ports: PortInfo[]): string {
  return JSON.stringify(ports, null, 2);
}

export function formatPortCsv(ports: PortInfo[]): string {
  const headers = ['port', 'protocol', 'pid', 'process', 'address', 'state', 'project'];
  const lines: string[] = [headers.join(',')];

  for (const p of ports) {
    const row = [
      p.port,
      p.protocol,
      p.pid !== null ? p.pid : '',
      p.processName ? `"${p.processName.replace(/"/g, '""')}"` : '',
      `"${p.localAddress}"`,
      p.state,
      p.project ? `"${p.project.name.replace(/"/g, '""')}"` : ''
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}
