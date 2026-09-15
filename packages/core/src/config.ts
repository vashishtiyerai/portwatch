import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface PortWatchConfig {
  refreshInterval: number; // in ms
  theme: 'dark' | 'light';
  historyEnabled: boolean;
  confirmKill: boolean;
  allowForceKill: boolean;
  portRange?: { min: number; max: number };
}

export const DEFAULT_CONFIG: PortWatchConfig = {
  refreshInterval: 2000,
  theme: 'dark',
  historyEnabled: true,
  confirmKill: true,
  allowForceKill: true,
};

export function getConfigPath(customDir?: string): string {
  const dir = customDir || path.join(os.homedir(), '.portwatch');
  return path.join(dir, 'config.json');
}

export function loadConfig(customDir?: string): PortWatchConfig {
  try {
    const configPath = getConfigPath(customDir);
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ...DEFAULT_CONFIG, ...data };
    }
  } catch {
    // Fall back to default config on read or parse failure
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: Partial<PortWatchConfig>, customDir?: string): boolean {
  try {
    const configPath = getConfigPath(customDir);
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const merged = { ...loadConfig(customDir), ...config };
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}
