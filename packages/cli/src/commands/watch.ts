import { getPlatformProvider, PortHistoryTracker } from '@portwatch/core';

export async function handleWatchCommand(): Promise<number> {
  const provider = getPlatformProvider();
  const tracker = new PortHistoryTracker();

  const bold = '\x1b[1m';
  const cyan = '\x1b[36m';
  const green = '\x1b[32m';
  const red = '\x1b[31m';
  const dim = '\x1b[2m';
  const reset = '\x1b[0m';

  process.stdout.write(`\n${bold}PORTWATCH — Live Monitoring${reset}\n`);
  process.stdout.write(`${dim}Watching for port socket changes. Press Ctrl+C to exit.${reset}\n\n`);

  // Initial snapshot
  const initialPorts = await provider.listPorts();
  tracker.updateSnapshot(initialPorts);
  process.stdout.write(`${dim}Initial active ports: ${initialPorts.length} listening${reset}\n\n`);

  let running = true;
  process.on('SIGINT', () => {
    running = false;
    process.stdout.write(`\n${dim}Monitoring stopped.${reset}\n`);
    process.exit(0);
  });

  while (running) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    try {
      const current = await provider.listPorts();
      const events = tracker.updateSnapshot(current);

      for (const event of events) {
        const timeStr = new Date(event.timestamp).toLocaleTimeString();
        if (event.event === 'opened') {
          const procStr = event.processName ? ` by ${bold}${event.processName}${reset}` : '';
          const pidStr = event.pid ? ` (PID ${event.pid})` : '';
          process.stdout.write(`[${dim}${timeStr}${reset}] ${green}+ Port ${bold}${event.port}${reset}${green} opened${reset}${procStr}${pidStr}\n`);
        } else {
          const procStr = event.processName ? ` (${event.processName})` : '';
          process.stdout.write(`[${dim}${timeStr}${reset}] ${red}- Port ${bold}${event.port}${reset}${red} closed${reset}${procStr}\n`);
        }
      }
    } catch {
      // Continue watching
    }
  }

  return 0;
}
