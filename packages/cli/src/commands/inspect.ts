import { getPlatformProvider, ProcessTreeNode } from '@portwatch/core';

export async function handleInspectCommand(pidArg: string, json: boolean = false): Promise<number> {
  const pid = parseInt(pidArg, 10);
  if (isNaN(pid) || pid <= 0) {
    process.stderr.write(`Error: Invalid PID "${pidArg}".\n`);
    return 2;
  }

  const provider = getPlatformProvider();
  const info = await provider.inspect(pid);

  if (!info) {
    if (json) {
      process.stdout.write(JSON.stringify({ found: false, pid }, null, 2) + '\n');
    } else {
      process.stderr.write(`Process with PID ${pid} not found or inaccessible.\n`);
    }
    return 3;
  }

  const tree = await provider.getProcessTree(pid);

  if (json) {
    process.stdout.write(JSON.stringify({ info, tree }, null, 2) + '\n');
    return 0;
  }

  const bold = '\x1b[1m';
  const cyan = '\x1b[36m';
  const yellow = '\x1b[33m';
  const dim = '\x1b[2m';
  const reset = '\x1b[0m';

  process.stdout.write(`\n${bold}Process Inspection:${reset} ${cyan}${info.name}${reset} (PID ${yellow}${info.pid}${reset})\n\n`);
  process.stdout.write(`  ${bold}Name:${reset}              ${info.name}\n`);
  process.stdout.write(`  ${bold}PID:${reset}               ${yellow}${info.pid}${reset}\n`);
  if (info.parentPid) {
    process.stdout.write(`  ${bold}Parent PID:${reset}        ${info.parentPid}\n`);
  }
  if (info.executablePath) {
    process.stdout.write(`  ${bold}Executable:${reset}        ${info.executablePath}\n`);
  }
  if (info.commandLine) {
    process.stdout.write(`  ${bold}Command Line:${reset}      ${dim}${info.commandLine}${reset}\n`);
  }
  if (info.workingDirectory) {
    process.stdout.write(`  ${bold}Directory:${reset}         ${info.workingDirectory}\n`);
  }
  if (info.cpuPercent !== null && info.cpuPercent !== undefined) {
    process.stdout.write(`  ${bold}CPU Usage:${reset}         ${info.cpuPercent.toFixed(1)}%\n`);
  }
  if (info.startedAt) {
    process.stdout.write(`  ${bold}Started At:${reset}        ${info.startedAt}\n`);
  }

  if (tree && tree.children.length > 0) {
    process.stdout.write(`\n  ${bold}Process Tree:${reset}\n`);
    renderTree(tree, '  ');
  }

  process.stdout.write('\n');
  return 0;
}

function renderTree(node: ProcessTreeNode, prefix: string): void {
  const dim = '\x1b[2m';
  const reset = '\x1b[0m';
  process.stdout.write(`${prefix}└── ${node.name} ${dim}(PID ${node.pid})${reset}\n`);
  for (const child of node.children) {
    renderTree(child, prefix + '    ');
  }
}
