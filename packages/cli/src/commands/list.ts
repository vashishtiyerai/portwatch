import { getPlatformProvider, identifyProject } from '@portwatch/core';
import { formatPortTable } from '../formatters/table';
import { formatPortJson, formatPortCsv } from '../formatters/json';

export interface ListOptions {
  json?: boolean;
  csv?: boolean;
  quiet?: boolean;
  proto?: 'tcp' | 'udp';
  state?: string;
}

export async function handleListCommand(options: ListOptions): Promise<number> {
  const provider = getPlatformProvider();
  let ports = await provider.listPorts();

  // Apply filters
  if (options.proto) {
    ports = ports.filter(p => p.protocol === options.proto);
  }
  if (options.state && options.state.toLowerCase() !== 'all') {
    ports = ports.filter(p => p.state.toLowerCase() === options.state?.toLowerCase());
  }

  // Attempt smart project identification for ports with PIDs
  for (const port of ports) {
    if (port.pid) {
      const processInfo = await provider.inspect(port.pid);
      if (processInfo) {
        port.project = identifyProject(processInfo);
      }
    }
  }

  if (options.quiet) {
    for (const p of ports) {
      process.stdout.write(`${p.port}\n`);
    }
    return 0;
  }

  if (options.json) {
    process.stdout.write(formatPortJson(ports) + '\n');
    return 0;
  }

  if (options.csv) {
    process.stdout.write(formatPortCsv(ports) + '\n');
    return 0;
  }

  const output = formatPortTable(ports, process.stdout.isTTY);
  process.stdout.write(output + '\n');
  return 0;
}
