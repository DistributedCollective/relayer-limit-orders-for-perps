module.exports = {
  apps : [{
    name   : "testnet-relayer-btcusd-v2",
    script : "ts-node start.ts",
    max_memory_restart : "1000M",
    log_date_format : "YYYY-MM-DD HH:mm Z",
    env: {
      PERP_ID: "0x369d7c01e026e750d616303e0fa4ac262c55e4ebe19a54cbf15d814b03b1182b",
      ORDER_BOOK_ADDRESS: "0x1987D24dc913Df4A0187a45417957cc42634e1eE",
      IDX_ADDR_START: 0,
      NUM_ADDRESSES: 3,
      PERP_NAME: 'TESTNET-BTCUSD',
      OWNER_ADDRESS:"0xE7c7417D1360B188401f4dd4bc757A0bc4dE433f",
      MANAGER_ADDRESS: "0xc44B7c208DaD00E647F48d00093e510A29579C09",
      TOKEN_ADDRESS: "0xcF3D22A034Fa157985F0Fe71F15477446f80Be26",
      NODE_URLS: '["https://data-seed-prebsc-1-s1.binance.org:8545/","https://data-seed-prebsc-2-s1.binance.org:8545/","http://data-seed-prebsc-1-s2.binance.org:8545/","http://data-seed-prebsc-2-s2.binance.org:8545/","https://data-seed-prebsc-1-s3.binance.org:8545","https://data-seed-prebsc-2-s3.binance.org:8545"]',
      HEARTBEAT_LISTENER_URL: "https://thenurse.prforge.com/api/heartbeats",
      HEARTBEAT_SHOULD_RESTART_URL: "https://thenurse.prforge.com/api/heartbeats/should-restart",

      DB_NAME: "relayer_testnet_btcusd.db",
      BLOCK_EXPLORER: "https://testnet.bscscan.com/",
      SERVER_PORT: 3014,
      BALANCE_THRESHOLD: 1,
      INACTIVITY_TIMEOUT: 120,
      PAYMASTER_ADDRESS: "0x402e4370f6871Ff59Db75aE578e038E101454dc1"
    }
  },
  {
    name   : "testnet-relayer-bnbusd-v2",
    script : "ts-node start.ts",
    max_memory_restart : "1000M",
    log_date_format : "YYYY-MM-DD HH:mm Z",
    env: {
      PERP_ID: "0x75848bb7f08d2e009e76fdad5a1c6129e48df34d81245405f9c43b53d204dfaf",
      ORDER_BOOK_ADDRESS: "0x730a91D1AC9B37f75C4Fe52DbbF51Dd2177e517C",
      IDX_ADDR_START: 0,
      NUM_ADDRESSES: 3,
      PERP_NAME: 'TESTNET-BNBUSD',
      OWNER_ADDRESS:"0xE7c7417D1360B188401f4dd4bc757A0bc4dE433f",
      MANAGER_ADDRESS: "0xc44B7c208DaD00E647F48d00093e510A29579C09",
      TOKEN_ADDRESS: "0xcF3D22A034Fa157985F0Fe71F15477446f80Be26",
      NODE_URLS: '["https://data-seed-prebsc-1-s1.binance.org:8545/","https://data-seed-prebsc-2-s1.binance.org:8545/","http://data-seed-prebsc-1-s2.binance.org:8545/","http://data-seed-prebsc-2-s2.binance.org:8545/","https://data-seed-prebsc-1-s3.binance.org:8545","https://data-seed-prebsc-2-s3.binance.org:8545"]',
      HEARTBEAT_LISTENER_URL: "https://thenurse.prforge.com/api/heartbeats",
      HEARTBEAT_SHOULD_RESTART_URL: "https://thenurse.prforge.com/api/heartbeats/should-restart",

      DB_NAME: "relayer_testnet_btcusd.db",
      BLOCK_EXPLORER: "https://testnet.bscscan.com/",
      SERVER_PORT: 3015,
      BALANCE_THRESHOLD: 1,
      PAYMASTER_ADDRESS: "0x402e4370f6871Ff59Db75aE578e038E101454dc1",
      INACTIVITY_TIMEOUT: 120,
    }
  }]
}
