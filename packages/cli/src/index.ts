import { handleListCommand } from './commands/list';
import { handleFindCommand } from './commands/find';
import { handleFreeCommand } from './commands/free';
import { handleKillCommand } from './commands/kill';
import { handleInspectCommand } from './commands/inspect';
import { handleWatchCommand } from './commands/watch';
import { handleDoctorCommand } from './commands/doctor';

const VERSION = '0.1.0';

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const args = [...argv];
  const command = args[0]?.toLowerCase();

  // Flags parsing helper
  const hasFlag = (...flags: string[]) => {
    return flags.some(f => args.includes(f));
  };

  const getFlagValue = (...flags: string[]) => {
    for (const f of flags) {
      const idx = args.indexOf(f);
      if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('-')) {
        return args[idx + 1];
      }
    }
    return undefined;
  };

  const isJson = hasFlag('--json');
  const isCsv = hasFlag('--csv');
  const isQuiet = hasFlag('-q', '--quiet');
  const isForce = hasFlag('-f', '--force');
  const isYes = hasFlag('-y', '--yes');

  if (hasFlag('-v', '--version', 'version')) {
    process.stdout.write(`portwatch version ${VERSION}\n`);
    return 0;
  }

  if (hasFlag('-h', '--help', 'help')) {
    printHelp();
    return 0;
  }

  // Route commands
  switch (command) {
    case 'list':
      return handleListCommand({
        json: isJson,
        csv: isCsv,
        quiet: isQuiet,
        proto: (getFlagValue('--proto') as any) || undefined,
        state: getFlagValue('--state') || undefined,
      });

    case 'find': {
      const port = args[1];
      if (!port || port.startsWith('-')) {
        process.stderr.write('Error: Port argument required. Usage: portwatch find <port>\n');
        return 2;
      }
      return handleFindCommand(port, isJson);
    }

    case 'free': {
      const port = args[1];
      if (!port || port.startsWith('-')) {
        process.stderr.write('Error: Port argument required. Usage: portwatch free <port>\n');
        return 2;
      }
      return handleFreeCommand(port, { force: isForce, yes: isYes, json: isJson });
    }

    case 'kill': {
      const port = args[1];
      if (!port || port.startsWith('-')) {
        process.stderr.write('Error: Port argument required. Usage: portwatch kill <port>\n');
        return 2;
      }
      return handleKillCommand(port, { force: isForce, yes: isYes, json: isJson });
    }

    case 'inspect': {
      const pid = args[1];
      if (!pid || pid.startsWith('-')) {
        process.stderr.write('Error: PID argument required. Usage: portwatch inspect <pid>\n');
        return 2;
      }
      return handleInspectCommand(pid, isJson);
    }

    case 'watch':
      return handleWatchCommand();

    case 'doctor':
      return handleDoctorCommand(isJson);

    case 'ui': {
      // Launch server and open browser
      try {
        const { startServer } = require('@portwatch/server');
        startServer({ openBrowser: true });
        return 0;
      } catch (err: any) {
        process.stderr.write(`Error starting PortWatch UI: ${err.message}\n`);
        return 1;
      }
    }

    default:
      // If first arg is a number, treat as `find <port>`
      if (command && /^\d+$/.test(command)) {
        return handleFindCommand(command, isJson);
      }

      // If unrecognized subcommand starting with letter
      if (command && !command.startsWith('-')) {
        process.stderr.write(`Error: Unknown command "${command}". Run "portwatch --help" for usage.\n`);
        return 2;
      }

      // Default action: `portwatch list`
      return handleListCommand({
        json: isJson,
        csv: isCsv,
        quiet: isQuiet,
        proto: (getFlagValue('--proto') as any) || undefined,
        state: getFlagValue('--state') || undefined,
      });
  }
}

function printHelp(): void {
  const bold = '\x1b[1m';
  const cyan = '\x1b[36m';
  const dim = '\x1b[2m';
  const reset = '\x1b[0m';

  process.stdout.write(`
${bold}PORTWATCH${reset} — Know what's using your ports.

${bold}USAGE:${reset}
  portwatch [command] [options]
  portwatch <port>               (Shorthand for "portwatch find <port>")

${bold}COMMANDS:${reset}
  ${cyan}list${reset}                   List active listening sockets (default)
  ${cyan}find <port>${reset}            Find what process is using a specific port
  ${cyan}free <port>${reset}            Safely identify, prompt, terminate, and verify port release
  ${cyan}kill <port>${reset}            Terminate the process occupying a port
  ${cyan}inspect <pid>${reset}          Inspect deep process information and process tree
  ${cyan}watch${reset}                  Live continuous monitoring of port activity
  ${cyan}doctor${reset}                 Run system diagnostics and verify environment
  ${cyan}ui${reset}                     Launch the local PortWatch web/desktop GUI
  ${cyan}version${reset}                Show version information

${bold}OPTIONS:${reset}
  ${cyan}--json${reset}                 Output in machine-readable JSON format
  ${cyan}--csv${reset}                  Output in CSV format
  ${cyan}-y, --yes${reset}              Skip interactive confirmation prompts
  ${cyan}-f, --force${reset}            Force kill process immediately (SIGKILL)
  ${cyan}-q, --quiet${reset}            Output only port numbers or minimal data
  ${cyan}--proto <tcp|udp>${reset}      Filter by protocol
  ${cyan}--state <state>${reset}        Filter by socket state
  ${cyan}-h, --help${reset}             Show this help screen
  ${cyan}-v, --version${reset}          Show version

${bold}EXIT CODES:${reset}
  0 = Success
  1 = General runtime error
  2 = Invalid arguments
  3 = Port or process not found
  4 = Permission denied
  5 = Process termination / verify failed

${bold}EXAMPLES:${reset}
  $ portwatch
  $ portwatch 3000
  $ portwatch free 3000
  $ portwatch list --json
  $ portwatch watch
`);
}
