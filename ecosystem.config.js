module.exports = {
  apps : [{
    name   : "testnet-relayer-btcusd",
    script : "ts-node start.ts",
    max_memory_restart : "1000M",
    log_date_format : "YYYY-MM-DD HH:mm Z",
    env: {
      PERP_ID: "0x369d7c01e026e750d616303e0fa4ac262c55e4ebe19a54cbf15d814b03b1182b",
      ORDER_BOOK_ADDRESS: "0x1A4128d3ECa24F881b54527E16aaFd1d64A733cC",
      IDX_ADDR_START: 0,
      NUM_ADDRESSES: 3,
      PERP_NAME: 'TESTNET-BTCUSD',
      OWNER_ADDRESS:"0xE7c7417D1360B188401f4dd4bc757A0bc4dE433f",
      MANAGER_ADDRESS: "0xE952cCc755758A127623163e96B032619Bb42143",
      TOKEN_ADDRESS: "0xcF3D22A034Fa157985F0Fe71F15477446f80Be26",
      NODE_URLS: '["https://data-seed-prebsc-1-s1.binance.org:8545/","https://data-seed-prebsc-2-s1.binance.org:8545/","http://data-seed-prebsc-1-s2.binance.org:8545/","http://data-seed-prebsc-2-s2.binance.org:8545/","https://data-seed-prebsc-1-s3.binance.org:8545","https://data-seed-prebsc-2-s3.binance.org:8545"]',
      HEARTBEAT_LISTENER_URL: "https://thenurse.prforge.com/api/heartbeats",
      HEARTBEAT_SHOULD_RESTART_URL: "https://thenurse.prforge.com/api/heartbeats/should-restart",
      TESTNET: true,

      DB_NAME: "relayer_testnet_btcusd.db",
      BLOCK_EXPLORER: "https://testnet.bscscan.com/",
      SERVER_PORT: 3014,
      BALANCE_THRESHOLD: 1,
    }
  },
  {
    name   : "testnet-relayer-bnbusd",
    script : "ts-node start.ts",
    max_memory_restart : "1000M",
    log_date_format : "YYYY-MM-DD HH:mm Z",
    env: {
      PERP_ID: "0x75848bb7f08d2e009e76fdad5a1c6129e48df34d81245405f9c43b53d204dfaf",
      ORDER_BOOK_ADDRESS: "0x959402A2bc8A2984100a623121712dA165b4A74c",
      IDX_ADDR_START: 0,
      NUM_ADDRESSES: 3,
      PERP_NAME: 'TESTNET-BNBUSD',
      OWNER_ADDRESS:"0xE7c7417D1360B188401f4dd4bc757A0bc4dE433f",
      MANAGER_ADDRESS: "0xE952cCc755758A127623163e96B032619Bb42143",
      TOKEN_ADDRESS: "0xcF3D22A034Fa157985F0Fe71F15477446f80Be26",
      NODE_URLS: '["https://data-seed-prebsc-1-s1.binance.org:8545/","https://data-seed-prebsc-2-s1.binance.org:8545/","http://data-seed-prebsc-1-s2.binance.org:8545/","http://data-seed-prebsc-2-s2.binance.org:8545/","https://data-seed-prebsc-1-s3.binance.org:8545","https://data-seed-prebsc-2-s3.binance.org:8545"]',
      HEARTBEAT_LISTENER_URL: "https://thenurse.prforge.com/api/heartbeats",
      HEARTBEAT_SHOULD_RESTART_URL: "https://thenurse.prforge.com/api/heartbeats/should-restart",
      TESTNET: true,

      DB_NAME: "relayer_testnet_btcusd.db",
      BLOCK_EXPLORER: "https://testnet.bscscan.com/",
      SERVER_PORT: 3015,
      BALANCE_THRESHOLD: 1,
    }
  }]
}
