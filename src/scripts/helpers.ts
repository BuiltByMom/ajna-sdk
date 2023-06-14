import { EOL } from 'os';

export function spaceLog(...args: any[]) {
  console.log(EOL, ...args, EOL);
}
