import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { HistoryEvent, PortInfo } from './types';

export class PortHistoryTracker {
  private events: HistoryEvent[] = [];
  private maxEvents: number = 200;
  private storagePath: string;
  private activePorts: Map<string, PortInfo> = new Map();

  constructor(customStoragePath?: string) {
    if (customStoragePath) {
      this.storagePath = customStoragePath;
    } else {
      const home = os.homedir();
      const dir = path.join(home, '.portwatch');
      this.storagePath = path.join(dir, 'history.json');
    }
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    if (this.storagePath === ':memory:') return;
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this.events = parsed.slice(-this.maxEvents);
        }
      }
    } catch {
      // Gracefully continue with in-memory buffer if read fails
      this.events = [];
    }
  }

  private saveToDisk(): void {
    if (this.storagePath === ':memory:') return;
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storagePath, JSON.stringify(this.events.slice(-this.maxEvents), null, 2), 'utf8');
    } catch {
      // Fail silently if disk permissions prevent writing
    }
  }

  /**
   * Updates tracking with the latest active port snapshot and records state transitions (opened/closed).
   */
  public updateSnapshot(currentPorts: PortInfo[]): HistoryEvent[] {
    const newEvents: HistoryEvent[] = [];
    const currentKeyMap = new Map<string, PortInfo>();

    for (const port of currentPorts) {
      const key = `${port.protocol}:${port.port}`;
      currentKeyMap.set(key, port);

      if (!this.activePorts.has(key)) {
        // Port just opened!
        const event: HistoryEvent = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          port: port.port,
          protocol: port.protocol,
          event: 'opened',
          timestamp: new Date().toISOString(),
          processName: port.processName,
          pid: port.pid,
          project: port.project?.name || null,
        };
        this.events.push(event);
        newEvents.push(event);
      }
    }

    // Check for closed ports
    for (const [key, oldPort] of this.activePorts.entries()) {
      if (!currentKeyMap.has(key)) {
        // Port just closed!
        const event: HistoryEvent = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          port: oldPort.port,
          protocol: oldPort.protocol,
          event: 'closed',
          timestamp: new Date().toISOString(),
          processName: oldPort.processName,
          pid: oldPort.pid,
          project: oldPort.project?.name || null,
        };
        this.events.push(event);
        newEvents.push(event);
      }
    }

    this.activePorts = currentKeyMap;

    if (newEvents.length > 0) {
      if (this.events.length > this.maxEvents) {
        this.events = this.events.slice(-this.maxEvents);
      }
      this.saveToDisk();
    }

    return newEvents;
  }

  public getEvents(limit?: number): HistoryEvent[] {
    const list = [...this.events].reverse();
    return limit ? list.slice(0, limit) : list;
  }

  public getEventsForPort(port: number): HistoryEvent[] {
    return this.events.filter(e => e.port === port).reverse();
  }

  public clear(): void {
    this.events = [];
    this.activePorts.clear();
    if (this.storagePath === ':memory:') return;
    try {
      if (fs.existsSync(this.storagePath)) {
        fs.unlinkSync(this.storagePath);
      }
    } catch {
      // Ignore
    }
  }
}
