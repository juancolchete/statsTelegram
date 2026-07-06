import { Controller, Get } from '@nestjs/common';
import { BotService } from './bot/bot.service'; // Make sure the path matches your structure

@Controller()
export class AppController {
  // Injecting it here forces NestJS to instantiate the bot when the app starts
  constructor(private readonly botService: BotService) {}

  @Get()
  getHello(): string {
    return 'Server is running!';
  }
}
