module.exports = {
  apps : [{
    name   : "relayer-btcusd",
    script : "ts-node src/main.ts",
    max_memory_restart : "1000M",
    log_date_format : "YYYY-MM-DD HH:mm Z",
    env: {
      ORDER_BOOK_ADDRESS: "0xF683eED9590E2f90fe991E9e5A736f8BEDEa84Cd",
      IDX_ADDR_START: 0,
      NUM_ADDRESSES: 3,
      PERP_NAME: 'BTCUSD',
    }
  },
  {
    name   : "relayer-bnbusd",
    script : "ts-node src/main.ts",
    max_memory_restart : "1000M",
    log_date_format : "YYYY-MM-DD HH:mm Z",
    env: {
      ORDER_BOOK_ADDRESS: "0xA9a91c803a994332c1020D2DACFEBbfC53D65533",
      IDX_ADDR_START: 3,
      NUM_ADDRESSES: 3,
      PERP_NAME: 'BNBUSD',
    }
  }]
}
