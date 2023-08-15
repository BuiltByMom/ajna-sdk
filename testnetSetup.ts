import { spawnSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

export default async function setup() {
  // Create docker container with an Ajna deployment.
  const setupProcess = spawnSync('docker compose up --force-recreate -d; sleep 3', [], {
    shell: true,
    stdio: 'pipe',
    encoding: 'utf-8',
  });

  // Print error information if container fails to start.
  if (!setupProcess || setupProcess.status !== 0 || setupProcess.output[2]?.includes('ERROR')) {
    console.info(setupProcess.output[2]);
    process.exit(1);
  } else {
    console.info('started', setupProcess);
  }
}
