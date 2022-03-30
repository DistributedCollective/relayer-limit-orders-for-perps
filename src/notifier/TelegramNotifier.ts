import { Telegram } from "telegraf";
import { INotifier } from "./INotifier";

export default class TelegramNotifier implements INotifier {
    private bot;
    private telegramId;
    private lastSentAt = new Date().getTime();
    private delayBetweenMessages = 30_000; // at most one message every 30 seconds

    constructor(telegramSecret: string, telegramId: string) {
        this.bot = new Telegram(telegramSecret);
        this.telegramId = telegramId;
    }

    async sendMessage(message: string, extra = {}): Promise<void> {
        try {
            let now = new Date().getTime();
            if(now - this.lastSentAt < this.delayBetweenMessages){
                console.log(`RATE LIMIT, not sending message ${message}`);
                return;
            }
            await this.bot.sendMessage(this.telegramId, message, extra);
            this.lastSentAt = new Date().getTime();
        } catch (err) {
            console.log(err);
        }
    }
}
