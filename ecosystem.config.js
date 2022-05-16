module.exports = {
  apps : [{
    name   : "relayer-btcusd",
    script : "ts-node src/main.ts",
    max_memory_restart : "1000M",
    log_date_format : "YYYY-MM-DD HH:mm Z",
    env: {
      ORDER_BOOK_ADDRESS: "0x66E69f3052A7B5Ce40f146a486d0209425cA4FD1",
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
      ORDER_BOOK_ADDRESS: "0x8cD6b7CA3006e874875e03f806969D095B335AD0",
      IDX_ADDR_START: 3,
      NUM_ADDRESSES: 3,
      PERP_NAME: 'BNBUSD',
    }
  }]
}
