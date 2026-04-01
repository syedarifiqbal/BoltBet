import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './AppService';
import { RabbitMQService } from './rabbitmq/RabbitmqService';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * POST /publish
   * Body: any JSON object, e.g. { "task": "send_email", "to": "user@example.com" }
   *
   * This pushes the payload onto the task_queue.
   * The consumer in RabbitMQService.onModuleInit() will pick it up immediately.
   */
  @Post('publish')
  async publishMessage(@Body() body: Record<string, unknown>) {
    await this.rabbitMQService.publish(body);
    return { status: 'queued', payload: body };
  }
}
