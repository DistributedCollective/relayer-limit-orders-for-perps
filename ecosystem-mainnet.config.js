module.exports = {
  apps: [
  {
    name: "mainnet-relayer-btcusd",
    script: "ts-node start.ts",
    max_memory_restart: "1000M",
    log_date_format: "YYYY-MM-DD HH:mm Z",
    env: {
      PERP_ID: "0x369d7c01e026e750d616303e0fa4ac262c55e4ebe19a54cbf15d814b03b1182b",
      ORDER_BOOK_ADDRESS: "0x3ee8dAe27Feb809BD51eEdda749c3C2f1851e492",
      IDX_ADDR_START: 0,
      NUM_ADDRESSES: 7,
      PERP_NAME: 'MAINNET-BTCUSD-RELAYER',
      MANAGER_ADDRESS: "0x86f586dc122d31E7654f89eb566B779C3D843e22",
      TOKEN_ADDRESS: "0x6a7F2d2e5D5756729e875c8F8fC254448E763Fdf",
      NODE_URLS: '["https://bsc.sovryn.app/testnet","https://bsc-dataseed1.binance.org/","https://bsc-dataseed2.binance.org/","https://bsc-dataseed3.binance.org/","https://bsc-dataseed4.binance.org/","https://bsc-dataseed1.defibit.io/","https://bsc-dataseed2.defibit.io/","https://bsc-dataseed3.defibit.io/", "https://bsc-dataseed4.defibit.io/", "https://bsc-dataseed1.ninicoin.io/", "https://bsc-dataseed2.ninicoin.io/", "https://bsc-dataseed3.ninicoin.io/", "https://bsc-dataseed4.ninicoin.io/"]',
      PUBLIC_NODE_PROVIDER: 'https://bsc-dataseed1.binance.org/',
      HEARTBEAT_LISTENER_URL: "https://thenurse.prforge.com/api/heartbeats",
      HEARTBEAT_SHOULD_RESTART_URL: "https://thenurse.prforge.com/api/heartbeats/should-restart",
      OWNER_ADDRESS: "0xC12742a5b12F76622350fB7558cc2B4A9c7de8e0", //gnosis safe owner address
      TESTNET: false,
      DB_NAME: "relayer_mainnet_btcusd.db",
      BLOCK_EXPLORER: "https://www.bscscan.com/",
      SERVER_PORT: 2006,
      BALANCE_THRESHOLD: 1,
      GRAPHQL_ENDPOINT: "https://api.thegraph.com/subgraphs/name/distributedcollective/sovryn-perpetual-futures",
      TELEGRAM_CHANNEL_ID: -703916961,
    }
  },
  ]
}
