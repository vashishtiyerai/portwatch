import { PlatformProvider } from '../types';
import { WindowsPortProvider } from './windows';
import { MacOSPortProvider } from './macos';
import { LinuxPortProvider } from './linux';
import { FallbackPortProvider } from './fallback';

export function getPlatformProvider(): PlatformProvider {
  switch (process.platform) {
    case 'win32':
      return new WindowsPortProvider();
    case 'darwin':
      return new MacOSPortProvider();
    case 'linux':
      return new LinuxPortProvider();
    default:
      return new FallbackPortProvider();
  }
}
