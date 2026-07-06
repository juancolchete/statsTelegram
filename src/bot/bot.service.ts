import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import * as TelegramBot from 'node-telegram-bot-api';
import * as nodemailer from 'nodemailer';

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private bot: TelegramBot;

  onModuleInit() {
    this.initBot();
  }

  initBot() {
    process.env.NTBA_FIX_319 = '1';
    const token = process.env.TELEGRAM_API;

    if (!token) {
      this.logger.warn('TELEGRAM_API is not defined in environment variables.');
      return;
    }

    this.bot = new TelegramBot(token, { polling: true });

    this.bot.on('message', async (msg) => {
      // Added optional chaining in case msg.text is undefined
      if (msg.text?.toString().toLowerCase().includes('publicip')) {
        try {
          const ip = await this.getPublicIp();
          this.bot.sendMessage(msg.chat.id, ip);
        } catch (error) {
          this.logger.error('Error fetching IP for Telegram', error);
          this.bot.sendMessage(msg.chat.id, 'Error fetching IP address.');
        }
      }
    });
  }

  // Runs every day at 8:00 AM. 
  // Change to CronExpression.EVERY_HOUR or a custom string like '0 * * * *' as needed.
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendIpViaEmail() {
    try {
      const ip = await this.getPublicIp();

      const transporter = nodemailer.createTransport({
        service: 'gmail', // E.g., 'gmail', 'sendgrid', or configure host/port
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.TARGET_EMAIL,
        subject: 'Server Public IP Address Update',
        text: `The current server public IP is: ${ip}`,
      });

      this.logger.log(`IP email successfully sent to ${process.env.TARGET_EMAIL}`);
    } catch (error) {
      this.logger.error('Failed to send IP email via Cron', error);
    }
  }

  // Refactored to a Promise so both the Bot and the Cron job can use it
  private getPublicIp(): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(`dig TXT +short o-o.myaddr.l.google.com @ns1.google.com | awk -F'"' '{ print $2}'`, (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }
        if (stderr) {
          return reject(new Error(stderr.toString()));
        }
        resolve(stdout.trim());
      });
    });
  }
}
