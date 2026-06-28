import { Test, TestingModule } from '@nestjs/testing';
import { MailerController } from './mailer.controller';
import { MailerService } from './mailer.service';

const mockMailerService = {
  sendMail: jest.fn(),
};

describe('MailerController', () => {
  let controller: MailerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailerController],
      providers: [{ provide: MailerService, useValue: mockMailerService }],
    }).compile();

    controller = module.get<MailerController>(MailerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
