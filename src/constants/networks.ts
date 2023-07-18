export const networks = {
  goerli: {
    ERC20PoolFactory: {
      address: '0x01Da8a85A5B525D476cA2b51e44fe7087fFafaFF',
    },
    ERC721PoolFactory: {
      address: '0x37048D43A65748409B04f4051eEd9480BEf68c82',
    },
    PositionManager: {
      address: '0x23E2EFF19bd50BfCF0364B7dCA01004D5cce41f9',
    },
    RewardsManager: {
      address: '0x994dE190dd763Af3126FcC8EdC139275937d800b',
    },
    GrantFund: {
      address: '0x881b4dFF6C72babA6f5eA60f34A61410c1EA1ec2',
    },
    PoolUtils: {
      address: '0xBB61407715cDf92b2784E9d2F1675c4B8505cBd8',
    },
    AjnaToken: {
      address: '0xaadebCF61AA7Da0573b524DE57c67aDa797D46c5',
    },
    rpcUrl: process.env.GOERLI_RPC,
    subgraph: process.env.GOERLI_SUBGRAPH,
    label: 'Goerli',
  },
  mainnet: {
    ERC20PoolFactory: {
      address: '0xe6F4d9711121e5304b30aC2Aae57E3b085ad3c4d',
    },
    ERC721PoolFactory: {
      address: '0xb8DA113516bfb986B7b8738a76C136D1c16c5609',
    },
    PositionManager: {
      address: '0x23E2EFF19bd50BfCF0364B7dCA01004D5cce41f9',
    },
    RewardsManager: {
      address: '',
    },
    GrantFund: {
      address: '',
    },
    PoolUtils: {
      address: '0x154FFf344f426F99E328bacf70f4Eb632210ecdc',
    },
    AjnaToken: {
      address: '0x9a96ec9B57Fb64FbC60B423d1f4da7691Bd35079',
    },
    rpcUrl: process.env.MAINNET_RPC,
    subgraph: process.env.MAINNET_SUBGRAPH,
    label: 'Mainnet',
  },
  aditi: {
    ERC20PoolFactory: {
      address: '0xD86c4A8b172170Da0d5C0C1F12455bA80Eaa42AD',
    },
    ERC721PoolFactory: {
      address: '0x9617ABE221F9A9c492D5348be56aef4Db75A692d',
    },
    PositionManager: {
      address: '0x6c5c7fD98415168ada1930d44447790959097482',
    },
    RewardsManager: {
      address: '0x6548dF23A854f72335902e58a1e59B50bb3f11F1',
    },
    GrantFund: {
      address: '0xE340B87CEd1af1AbE1CE8D617c84B7f168e3b18b',
    },
    PoolUtils: {
      address: '0x4f05DA51eAAB00e5812c54e370fB95D4C9c51F21',
    },
    AjnaToken: {
      address: '0x25Af17eF4E2E6A4A2CE586C9D25dF87FD84D4a7d',
    },
    rpcUrl: process.env.ADITI_RPC,
    subgraph: process.env.ADITI_SUBGRAPH,
    label: 'Aditi',
  },
};
