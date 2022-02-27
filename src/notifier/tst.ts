let configPath = process.argv?.[2] || "../.env";
require("dotenv").config({ path: configPath });
import TelegramNotifier from "./TelegramNotifier";

const {TELEGRAM_BOT_SECRET, TELEGRAM_CHANNEL_ID} = process.env;

(async function main(){
  if(!TELEGRAM_BOT_SECRET || !TELEGRAM_CHANNEL_ID){
    throw new Error(`TELEGRAM_BOT_SECRET or TELEGRAM_CHANNEL_ID env vars missing. Either set them in the terminal, or configure them in the .env file`);
  }
  let notifier = new TelegramNotifier(TELEGRAM_BOT_SECRET, TELEGRAM_CHANNEL_ID);
  await notifier.sendMessage('THE BOT SAYS HELLO WORLD', {});
})()