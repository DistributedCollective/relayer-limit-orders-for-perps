module.exports = {
  apps : [{
    name   : "relayer-limit-orders",
    script : "ts-node src/main.ts",
    max_memory_restart : "1000M",
    log_date_format : "YYYY-MM-DD HH:mm Z",
  }]
}
