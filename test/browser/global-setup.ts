import { resetEmulatorProgress } from './emulator';

export default async function globalSetup(): Promise<void> {
  await resetEmulatorProgress();
}
