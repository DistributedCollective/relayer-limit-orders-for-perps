module.exports = {
  apps : [{
    name   : "relayer-btcusd",
    script : "ts-node src/main.ts",
    max_memory_restart : "1000M",
    log_date_format : "YYYY-MM-DD HH:mm Z",
    env: {
      PERP_ID: "0xada5013122d395ba3c54772283fb069b10426056ef8ca54750cb9bb552a59e7d",
      ORDER_BOOK_ADDRESS: "0x1dC615EA11DA95A81249869728083B7e8B4cd307",
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
      PERP_ID: "0xcc69885fda6bcc1a4ace058b4a62bf5e179ea78fd58a1ccd71c22cc9b688792f",
      ORDER_BOOK_ADDRESS: "0xd49BF7858568829aF4aad2B5F5e794f9492B4790",
      IDX_ADDR_START: 0,
      NUM_ADDRESSES: 3,
      PERP_NAME: 'BNBUSD',
    }
  }]
}
