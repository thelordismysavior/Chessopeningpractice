import { resetEmulatorProgress } from './emulator';

export default async function globalSetup(): Promise<void> {
  if (process.env.SKIP_EMULATOR_SEED === 'true') return;
  await resetEmulatorProgress();
}
