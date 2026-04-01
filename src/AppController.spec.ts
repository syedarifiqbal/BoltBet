import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './AppController';
import { AppService } from './AppService';
import { RabbitMQService } from './rabbitmq/RabbitmqService';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: RabbitMQService,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
