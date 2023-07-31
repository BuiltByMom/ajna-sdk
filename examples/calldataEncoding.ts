import { BigNumber, ethers } from 'ethers';
import ajnaTokenAbi from './../src/abis/AjnaToken.json';
import { fromWad } from '../src/utils';

const address = '0xc91f4871cfDd1947DF6C23771F230853E0e27407';
const bigNumberAmount = BigNumber.from(1000);
const numberAmount = 1000;

// to encode calldata create an interface with the ABI that holds the method that we want to encode
const iface = new ethers.utils.Interface(ajnaTokenAbi);

const enconded1 = iface.encodeFunctionData('transfer', [address, bigNumberAmount]);
const enconded2 = iface.encodeFunctionData('transfer', [address, numberAmount]);
// econdoing works for both BigNumber and number
console.table([
  ['big number:', enconded1],
  ['number:', enconded2],
]);

// to decode calldata call decodeFunctionData with the same iface
const [to, amount] = iface.decodeFunctionData('transfer', enconded1);

console.log({ to, amount: fromWad(amount) });
