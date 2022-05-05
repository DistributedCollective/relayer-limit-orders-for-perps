module.exports = {
  apps : [{
    name   : "relayer-btcusd",
    script : "ts-node src/main.ts",
    max_memory_restart : "1000M",
    log_date_format : "YYYY-MM-DD HH:mm Z",
    env: {
      ORDER_BOOK_ADDRESS: "0x63d4076105798196acC55D31dCa57E518bb64Bf8",
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
      ORDER_BOOK_ADDRESS: "0x152C5ae9F8E6Adb91a97C38cD4F83ceE997D6FC2",
      IDX_ADDR_START: 3,
      NUM_ADDRESSES: 3,
      PERP_NAME: 'BNBUSD',
    }
  }]
}
