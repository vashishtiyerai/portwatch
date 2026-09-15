import { PortInfo } from '@portwatch/core';

// Safe ANSI color helpers that work without external dependencies
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function padVisible(str: string, width: number): string {
  const visibleLen = stripAnsi(str).length;
  const padLen = Math.max(0, width - visibleLen);
  return str + ' '.repeat(padLen);
}

export function formatPortTable(ports: PortInfo[], useColors: boolean = true): string {
  if (ports.length === 0) {
    return useColors 
      ? `${colors.gray}No active local listening sockets found.${colors.reset}`
      : 'No active local listening sockets found.';
  }

  const headers = ['PORT', 'PROTO', 'PROCESS', 'PID', 'ADDRESS', 'STATUS', 'PROJECT'];
  
  // Format rows with visible content
  const formattedRows = ports.map(p => {
    const portStr = String(p.port);
    const protoStr = p.protocol.toUpperCase();
    const processStr = p.processName || '-';
    const pidStr = p.pid !== null ? String(p.pid) : '-';
    const addrStr = p.localAddress;
    const statusText = `● ${p.state}`;
    const projectStr = p.project ? `${p.project.name} (${p.project.framework || p.project.type})` : '-';

    return {
      raw: [portStr, protoStr, processStr, pidStr, addrStr, statusText, projectStr],
      port: p,
    };
  });

  // Calculate maximum visible column widths
  const colWidths = headers.map((h, i) => {
    return Math.max(h.length, ...formattedRows.map(r => r.raw[i].length));
  });

  const lines: string[] = [];

  // Header line
  const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join('   ');
  lines.push(useColors ? `${colors.bold}${colors.dim}${headerLine}${colors.reset}` : headerLine);

  // Separator line
  const sepLine = colWidths.map(w => '─'.repeat(w)).join('───');
  lines.push(useColors ? `${colors.gray}${sepLine}${colors.reset}` : sepLine);

  // Data rows
  for (const row of formattedRows) {
    const p = row.port;
    const r = row.raw;

    if (!useColors) {
      const plainCells = r.map((cell, i) => cell.padEnd(colWidths[i]));
      lines.push(plainCells.join('   '));
    } else {
      const cPort = padVisible(`${colors.bold}${colors.cyan}${r[0]}${colors.reset}`, colWidths[0]);
      const cProto = padVisible(`${colors.gray}${r[1]}${colors.reset}`, colWidths[1]);
      const cProc = padVisible(`${colors.bold}${r[2]}${colors.reset}`, colWidths[2]);
      const cPid = padVisible(`${colors.yellow}${r[3]}${colors.reset}`, colWidths[3]);
      const cAddr = padVisible(`${colors.gray}${r[4]}${colors.reset}`, colWidths[4]);
      
      const dotColor = p.state === 'LISTENING' ? colors.green : colors.blue;
      const cStatus = padVisible(`${dotColor}●${colors.reset} ${colors.dim}${p.state}${colors.reset}`, colWidths[5]);
      
      const cProject = p.project 
        ? padVisible(`${colors.magenta}${r[6]}${colors.reset}`, colWidths[6])
        : padVisible(`${colors.gray}-${colors.reset}`, colWidths[6]);

      lines.push([cPort, cProto, cProc, cPid, cAddr, cStatus, cProject].join('   '));
    }
  }

  return lines.join('\n');
}
