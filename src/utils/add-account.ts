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
    stdin.on('data', this.pwd(this));
  };

  private pwd(me: this) {
    return (data: any) => {
      const c = data;
      const self = me;
      switch (c) {
        case '\u0004': // Ctrl-d
        case '\r':
        case '\n':
          return self.enter();
        case '\u0003': // Ctrl-c
          return self.ctrlC();
        default:
          // backspace
          if (c.charCodeAt(0) === 8) return this.backspace();
          else return self.newChar(c);
      }
    };
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
  }

  private newChar(char: string) {
    this.input += char;
    stdout.write('*'.repeat(char.length));
  }

  private backspace() {
    this.input = this.input.slice(0, this.input.length - 1);
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
