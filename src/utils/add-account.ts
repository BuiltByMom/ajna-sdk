import { Wallet, providers } from 'ethers';
import fs from 'fs';

const stdout = process.stdout;
const stdin = process.stdin;

class AddAccount {
  private provider: providers.Provider;
  private jsonKeystore: any;
  input: string;

  constructor(provider: providers.Provider = providers.getDefaultProvider()) {
    this.provider = provider;
    this.input = '';
  }

  addAccountFromKey = (key: string) => {
    return new Wallet(key, this.provider);
  };

  addAccountFromKeystore = (keystorePath: string) => {
    // read the keystore file, confirming it exists
    try {
      this.jsonKeystore = fs.readFileSync(keystorePath).toString();
    } catch (error) {
      if (!this.jsonKeystore) {
        // prettier-ignore
        console.error(`Could not find the jsonKeyStore at the path ${keystorePath}. Please try again.`);
        process.exit();
      }
    }

    stdout.write('Enter keystore password: ');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf-8');
    stdin.on('data', (c: string) => this.pwd(c));
  };

  private pwd(char: string) {
    switch (char) {
      case '\r':
      case '\n':
      case '\u0004': // Ctrl-d
        this.enter();
        break;
      case '\u0003': // Ctrl-c
        this.ctrlC();
        break;
      case '\u0008':
      case '\u007F':
        this.backspace();
        break;
      default:
        this.newChar(char);
        break;
    }
  }

  private enter() {
    stdin.removeListener('data', this.pwd);
    stdin.setRawMode(false);
    stdin.pause();
    this.unlockWallet(this.input);
  }

  private ctrlC() {
    stdin.removeListener('data', this.pwd);
    stdin.setRawMode(false);
    stdin.pause();
    process.exit();
  }

  private newChar(char: string) {
    stdout.write('*'.repeat(char.length));
    this.input += char;
  }

  private backspace() {
    if (this.input.length > 0) {
      this.input = this.input.slice(0, -1);
      process.stdout.write('\b \b');
    }
  }

  private unlockWallet(input: string) {
    let wallet = Wallet.fromEncryptedJsonSync(this.jsonKeystore, input);
    wallet = wallet.connect(this.provider);
    console.log('\n\nUnlocked Wallet!\n\n', wallet);
    return wallet;
  }
}

function addAccount(provider: providers.Provider = providers.getDefaultProvider()) {
  return new AddAccount(provider);
}

export { AddAccount, addAccount };
