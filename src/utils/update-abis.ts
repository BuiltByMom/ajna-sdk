import { FormatTypes, Interface } from 'ethers/lib/utils';
import fs from 'fs';
import path from 'node:path';

/**
 * Iterate through ABIs in a location specified by the environment.
 * Filter in ABIs we care about, translate and write Ethers.js-consumable ABIs
 * in the appropriate location.
 */
export const updateAbis = function () {
  const dir = fs.opendirSync(process.env.AJNA_ABIS!);
  let file;
  while ((file = dir.readSync()) !== null) {
    if (abisWeCareAbout.has(file.name)) {
      // read and parse JSON output written by contracts tooling
      const jsonAbi = fs.readFileSync(path.join(dir.path, file.name));
      const parsed = JSON.parse(jsonAbi.toString());
      // create the Ethers.js Interface used for translation,
      // and pass only the desired ABI content
      const iface = new Interface(parsed.abi);
      // perform the translation
      const formattedAbi = iface.format(FormatTypes.full).toString();
      const translatedAbi = JSON.stringify(JSON.parse(formattedAbi));
      // write the translated ABI to disk
      fs.writeFileSync(
        path.join(process.cwd(), 'src/abis', file.name),
        translatedAbi
      );
    }
  }
};

const abisWeCareAbout = new Set([
  'ERC20.json',
  'ERC20Pool.json',
  'ERC20PoolFactory.json',
  'ERC721.json',
  'ERC721Pool.json',
  'ERC721PoolFactory.json',
  'PoolInfoUtils.json',
]);
