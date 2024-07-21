import { Controller, Get, Post } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { SendEmailDTO } from './mail.interface';

@Controller('mailer')
export class MailerController {
  constructor(private readonly mailerService: MailerService) {}

  @Post('/send-email')
  async sendMail(){
    const dto: SendEmailDTO={
      // from:{name:"Lucy", address:"lucy@example.com"},
      recipients:[{name:'Hooper Koufie', address:'ckoomson75@gmail.com'}],
      subject:'Lucky Winner',
      html:'<p><strong>Hi John</strong> you just won some money</p>',
      text: '<p><strong>Hi John</strong> you just won some money</p>'
    };
    return await this.mailerService.sendEmail(dto);
  }
}
