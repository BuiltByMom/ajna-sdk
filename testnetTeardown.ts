import { execSync } from 'child_process';

export default async function teardown() {
  execSync('sleep 1; docker compose down');
}
