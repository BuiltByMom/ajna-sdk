import { ExtendableError } from 'ts-error';

class Error extends ExtendableError {
  getErr = () => {
    return null;
  };
}

export { Error };
