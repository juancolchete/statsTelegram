import { Injectable, OnModuleInit } from '@nestjs/common';
import { exec } from "child_process";

@Injectable()
export class BotService implements OnModuleInit {

  onModuleInit() {
    this.botMessage();
  }

  botMessage() {
    process.env.NTBA_FIX_319 = "1";
    const TelegramBot = require('node-telegram-bot-api');

    const token = process.env.TELEGRAM_API;

    const bot = new TelegramBot(token, { polling: true });

    bot.on('message', (msg) => {
      if (msg.text.toString().toLowerCase().includes("publicip")) {
        exec(`dig TXT +short o-o.myaddr.l.google.com @ns1.google.com | awk -F'"' '{ print $2}'`, (error: any, stdout: string, stderr: any) => {
          if (error) {
            console.log(`error: ${error.message}`);
            return;
          }
          if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
          }
          bot.sendMessage(msg.chat.id, stdout)
        });
      }
    });

  }
}
