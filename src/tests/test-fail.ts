// workaround to Jest bug involve backend changing from jasmine to circus
// from https://github.com/facebook/jest/issues/11698

function fail(reason = 'fail was called in a test.') {
  throw new Error(reason);
}

global.fail = fail;
