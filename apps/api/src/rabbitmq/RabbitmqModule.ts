import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { rabbitmqConfig } from '../config';
import { RabbitMQService } from './RabbitmqService';

// @Global() makes RabbitMQService injectable everywhere without needing to
// import RabbitMQModule in every feature module.
@Global()
@Module({
  imports: [
    // Register the 'rabbitmq' config namespace so @Inject(rabbitmqConfig.KEY)
    // works inside RabbitMQService. ConfigModule.forRoot() in AppModule makes
    // ConfigService globally available, but individual registerAs() tokens must
    // be registered in the module where they are consumed.
    ConfigModule.forFeature(rabbitmqConfig),
  ],
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
