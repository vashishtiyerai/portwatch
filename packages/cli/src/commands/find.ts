import { getPlatformProvider, identifyProject } from '@portwatch/core';

export async function handleFindCommand(portArg: string, json: boolean = false): Promise<number> {
  const portNumber = parseInt(portArg, 10);
  if (isNaN(portNumber) || portNumber <= 0 || portNumber > 65535) {
    process.stderr.write(`Error: Invalid port number "${portArg}". Port must be between 1 and 65535.\n`);
    return 2; // Invalid arguments
  }

  const provider = getPlatformProvider();
  const portInfo = await provider.findPort(portNumber);

  if (!portInfo) {
    if (json) {
      process.stdout.write(JSON.stringify({ found: false, port: portNumber }, null, 2) + '\n');
    } else {
      process.stdout.write(`Port ${portNumber} is free (no active process listening).\n`);
    }
    return 3; // Port not found
  }

  let processInfo = null;
  if (portInfo.pid) {
    processInfo = await provider.inspect(portInfo.pid);
    if (processInfo) {
      portInfo.project = identifyProject(processInfo);
    }
  }

  if (json) {
    process.stdout.write(JSON.stringify({ found: true, port: portInfo, process: processInfo }, null, 2) + '\n');
    return 0;
  }

  // Beautiful ANSI display
  const bold = '\x1b[1m';
  const cyan = '\x1b[36m';
  const green = '\x1b[32m';
  const yellow = '\x1b[33m';
  const magenta = '\x1b[35m';
  const dim = '\x1b[2m';
  const reset = '\x1b[0m';

  process.stdout.write(`\n${bold}Port ${cyan}${portInfo.port}${reset} is being used by:\n\n`);
  process.stdout.write(`  ${bold}Process:${reset}       ${portInfo.processName || 'Unknown'}\n`);
  process.stdout.write(`  ${bold}PID:${reset}           ${yellow}${portInfo.pid || 'Unknown'}${reset}\n`);
  process.stdout.write(`  ${bold}Protocol:${reset}      ${portInfo.protocol.toUpperCase()}\n`);
  process.stdout.write(`  ${bold}Address:${reset}       ${portInfo.localAddress}\n`);
  process.stdout.write(`  ${bold}Status:${reset}        ${green}● ${portInfo.state}${reset}\n`);

  if (portInfo.project) {
    process.stdout.write(`  ${bold}Project:${reset}       ${magenta}${portInfo.project.name}${reset} (${portInfo.project.framework || portInfo.project.type})\n`);
    process.stdout.write(`  ${bold}Directory:${reset}     ${dim}${portInfo.project.directory}${reset}\n`);
  }

  if (processInfo) {
    if (processInfo.commandLine) {
      process.stdout.write(`  ${bold}Command:${reset}       ${dim}${processInfo.commandLine}${reset}\n`);
    }
    if (processInfo.executablePath) {
      process.stdout.write(`  ${bold}Executable:${reset}    ${dim}${processInfo.executablePath}${reset}\n`);
    }
    if (processInfo.startedAt) {
      process.stdout.write(`  ${bold}Started:${reset}       ${processInfo.startedAt}\n`);
    }
  }

  process.stdout.write(`\n${dim}Quick Actions:${reset}\n`);
  process.stdout.write(`  Free this port:        ${bold}portwatch free ${portInfo.port}${reset}\n`);
  if (portInfo.pid) {
    process.stdout.write(`  Inspect process tree:  ${bold}portwatch inspect ${portInfo.pid}${reset}\n`);
  }
  process.stdout.write('\n');

  return 0;
}
