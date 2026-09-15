import * as readline from 'readline';
import { getPlatformProvider, SafetyManager, identifyProject } from '@portwatch/core';

export interface FreeOptions {
  force?: boolean;
  yes?: boolean;
  json?: boolean;
}

export async function handleFreeCommand(portArg: string, options: FreeOptions): Promise<number> {
  const port = parseInt(portArg, 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    process.stderr.write(`Error: Invalid port number "${portArg}".\n`);
    return 2;
  }

  const provider = getPlatformProvider();
  const safety = new SafetyManager(provider);
  const targetPort = await provider.findPort(port);

  if (!targetPort) {
    if (options.json) {
      process.stdout.write(JSON.stringify({ success: true, port, freed: true, alreadyFree: true }, null, 2) + '\n');
    } else {
      process.stdout.write(`Port ${port} is already free.\n`);
    }
    return 0;
  }

  // Inspect process details for safe confirmation display
  let processDetails = null;
  if (targetPort.pid) {
    processDetails = await provider.inspect(targetPort.pid);
  }

  // Check critical processes
  if (safety.isCriticalProcess(targetPort.processName, targetPort.pid)) {
    process.stderr.write(`\nError: Cannot terminate protected system process "${targetPort.processName || targetPort.pid}". Operation aborted.\n`);
    return 4; // Permission/safety denied
  }

  // Request confirmation unless --yes is passed
  if (!options.yes) {
    if (!process.stdin.isTTY) {
      process.stderr.write(`\nError: Refusing to terminate process PID ${targetPort.pid} in non-interactive environment without explicit confirmation.\nUse --yes (-y) to confirm termination.\n`);
      return 2;
    }

    const bold = '\x1b[1m';
    const yellow = '\x1b[33m';
    const cyan = '\x1b[36m';
    const dim = '\x1b[2m';
    const reset = '\x1b[0m';

    process.stdout.write(`\n${bold}Free port ${cyan}${port}${reset}?\n\n`);
    process.stdout.write(`  ${bold}Target Process:${reset}   ${targetPort.processName || 'Unknown'}\n`);
    process.stdout.write(`  ${bold}PID:${reset}              ${yellow}${targetPort.pid || 'Unknown'}${reset}\n`);
    if (processDetails?.commandLine) {
      process.stdout.write(`  ${bold}Command:${reset}          ${dim}${processDetails.commandLine}${reset}\n`);
    }
    if (processDetails?.workingDirectory) {
      process.stdout.write(`  ${bold}Directory:${reset}        ${dim}${processDetails.workingDirectory}${reset}\n`);
    }
    process.stdout.write('\n');

    const confirmed = await promptConfirmation('Are you sure you want to terminate this process and free the port? (y/N): ');
    if (!confirmed) {
      process.stdout.write('Operation cancelled.\n');
      return 0;
    }
  }

  // Execute safe termination and active verification
  const result = await safety.freePort(port, { force: options.force });

  if (options.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    if (result.success) {
      const green = '\x1b[32m';
      const reset = '\x1b[0m';
      process.stdout.write(`${green}✓ ${result.message}${reset}\n`);
    } else {
      const red = '\x1b[31m';
      const reset = '\x1b[0m';
      process.stderr.write(`${red}✗ ${result.message}${reset}\n`);
    }
  }

  return result.success ? 0 : 5;
}

function promptConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}
