import { Wallet, providers } from 'ethers';
import fs from 'fs';

const stdout = process.stdout;
const stdin = process.stdin;

class AddAccount {
  private provider: providers.Provider;
  private input = '';
  private jsonKeystore = '';
  private wallet?: Wallet;

  constructor(provider: providers.Provider = providers.getDefaultProvider()) {
    this.provider = provider;
  }

  addAccountFromKey = (key: string) => {
    return new Wallet(key, this.provider);
  };

  addAccountFromKeystore = async (keystorePath = '') => {
    // read the keystore file, confirming it exists
    try {
      this.jsonKeystore = fs.readFileSync(keystorePath as string).toString();
    } catch (error) {
      console.log(`error while trying to stringify keystore path -- ${keystorePath}:`, error);
    }

    if (keystorePath === '') {
      console.log(`Could not find the jsonKeyStore at the path ${keystorePath}.`);
    }

    if (!this.jsonKeystore) {
      process.exit();
    }

    stdout.write('Enter keystore password: ');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf-8');
    stdin.on('data', (c: string) => this.handleKeystroke(c));
    return this.getWallet();
  };

  getProvider() {
    return this.provider;
  }

  getWallet() {
    return this.wallet;
  }

  private handleKeystroke(char: string) {
    switch (char) {
      case '\r':
      case '\n':
      case '\u0004': {
        // Ctrl-d
        return this.enter();
      }
      case '\u0003': // Ctrl-c
        return this.ctrlC();
      case '\u0008':
      case '\u007F':
        return this.backspace();
      default:
        return this.newChar(char);
    }
  }

  private enter() {
    stdin.removeListener('data', this.handleKeystroke);
    stdin.setRawMode(false);
    stdin.pause();
    const wallet = this.unlockWallet(this.input);
    this.resetInput();
    return wallet;
  }

  private resetInput() {
    // Reset input (plaintext pw)
    this.input = '';
  }

  private ctrlC() {
    this.resetInput();
    stdin.removeListener('data', this.handleKeystroke);
    stdin.setRawMode(false);
    stdin.pause();
    process.exit();
  }

  private backspace() {
    if (this.input.length > 0) {
      this.input = this.input.slice(0, -1);
      stdout.write('\b \b');
    }
  }

  private newChar(char: string) {
    this.input = this.input.concat(char);
    stdout.write('*'.repeat(char.length));
  }

  private unlockWallet(input: string) {
    try {
      const wallet = Wallet.fromEncryptedJsonSync(this.jsonKeystore, input);
      this.wallet = wallet.connect(this.provider);
      console.log('\n\nUnlocked Wallet!\n\n', wallet.address);
      this.resetInput();
      return this.wallet;
    } catch (error: any) {
      console.error('ERROR:', error);
    }
    return;
  }
}

function addAccount(provider: providers.Provider = providers.getDefaultProvider()) {
  return new AddAccount(provider);
}

export { AddAccount, addAccount };
