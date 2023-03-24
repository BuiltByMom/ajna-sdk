import { spawnSync } from 'child_process';

export default async function setup() {
  const setupProcess = spawnSync('docker-compose up --force-recreate -d; sleep 3', [], {
    shell: true,
  });

  if (!setupProcess || setupProcess.status !== 0) {
    process.exit(1);
  }
}
