import { handleFreeCommand, FreeOptions } from './free';

export async function handleKillCommand(portArg: string, options: FreeOptions): Promise<number> {
  // Free command encapsulates the exact safe identify -> confirm -> terminate -> verify lifecycle
  return handleFreeCommand(portArg, options);
}
