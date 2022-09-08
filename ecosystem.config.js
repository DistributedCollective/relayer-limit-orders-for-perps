module.exports = {
  apps : [{
    name   : "testnet-relayer-btcusd-v2",
    script : "ts-node start.ts",
    max_memory_restart : "1000M",
    log_date_format : "YYYY-MM-DD HH:mm Z",
    env: {
      PERP_ID: "0x0d678e31a4b2825b806fe160675cd01dab159802c7f94397ce45ed91b5f3aac6",
      ORDER_BOOK_ADDRESS: "0x78C8B03ec76E6D2D73F733a652b3D24c8B493515",
      IDX_ADDR_START: 0,
      NUM_ADDRESSES: 3,
      PERP_NAME: 'TESTNET-BTCUSD',
      OWNER_ADDRESS:"0xE7c7417D1360B188401f4dd4bc757A0bc4dE433f",
      MANAGER_ADDRESS: "0x33E9e52Cf775b8F24eb42F7559FD9eE52bB37A3e",
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
      PERP_ID: "0x9b68e489a07c86105b2c34adda59d3851d6f33abd41be6e9559cf783147db5dd",
      ORDER_BOOK_ADDRESS: "0xDD3d566fdE0f552F7963B001f2Efb43b97C6566D",
      IDX_ADDR_START: 0,
      NUM_ADDRESSES: 3,
      PERP_NAME: 'TESTNET-BNBUSD',
      OWNER_ADDRESS:"0xE7c7417D1360B188401f4dd4bc757A0bc4dE433f",
      MANAGER_ADDRESS: "0x33E9e52Cf775b8F24eb42F7559FD9eE52bB37A3e",
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
