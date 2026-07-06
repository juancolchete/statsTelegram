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
      const text = msg.text?.toString().toLowerCase() || '';

      // 1. Check for the email command FIRST
      if (text.includes('publicipemail')) {
        try {
          await this.sendIpViaEmail();
          this.bot.sendMessage(msg.chat.id, `✅ IP address successfully sent to ${process.env.TARGET_EMAIL}`);
        } catch (error) {
          this.bot.sendMessage(msg.chat.id, '❌ Failed to send the email. Check server logs.');
        }
      } 
      // 2. Otherwise, check for the standard Telegram IP command
      else if (text.includes('publicip')) {
        try {
          const ip = await this.getPublicIp();
          this.bot.sendMessage(msg.chat.id, ip);
        } catch (error) {
          this.logger.error('Error fetching IP for Telegram', error);
          this.bot.sendMessage(msg.chat.id, '❌ Error fetching IP address.');
        }
      }
    });
  }

  // Runs every day at 8:00 AM automatically, AND when called by the bot
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendIpViaEmail() {
    try {
      const ip = await this.getPublicIp();

      const transporter = nodemailer.createTransport({
        service: 'gmail', 
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
      this.logger.error('Failed to send IP email', error);
      // Throw the error so the Telegram bot block can catch it and notify you
      throw error; 
    }
  }

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
