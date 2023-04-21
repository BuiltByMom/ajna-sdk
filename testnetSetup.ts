import { spawnSync } from 'child_process';

export default async function setup() {
  const setupProcess = spawnSync('docker-compose up --force-recreate -d; sleep 3', [], {
    shell: true,
    stdio: 'pipe',
    encoding: 'utf-8',
  });

  if (!setupProcess || setupProcess.status !== 0 || setupProcess.output[2]?.includes('ERROR')) {
    console.info(setupProcess.output[2]);
    process.exit(1);
  }
}
