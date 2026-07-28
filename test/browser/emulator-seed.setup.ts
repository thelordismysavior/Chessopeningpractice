import { test as setup } from '@playwright/test';
import { resetEmulatorProgress } from './emulator';

setup('the emulator holds an approved test account', async () => {
  await resetEmulatorProgress();
});
