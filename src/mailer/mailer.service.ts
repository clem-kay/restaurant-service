import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SendEmailDTO } from './mail.interface';
import Mail from 'nodemailer/lib/mailer';
import { google } from 'googleapis';

@Injectable()
export class MailerService {

    constructor(private readonly configService: ConfigService){}

     
    async getTransport() {
        const CLIENT_ID = this.configService.get<string>('CLIENT_ID');
        const CLIENT_SECRET = this.configService.get<string>('CLIENT_SECRET');
        const REDIRECT_URI = this.configService.get<string>('REDIRECT_URI');
        const REFRESH_TOKEN = this.configService.get<string>('REFRESH_TOKEN');
        const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
        oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

        console.log(REFRESH_TOKEN)
        console.log(CLIENT_SECRET)
        console.log(REDIRECT_URI)
        console.log(CLIENT_ID)

        let accessToken;
        try {
            await oAuth2Client.getAccessToken();
            console.log(accessToken)
        } catch (error) {
            console.error('Failed to fetch access token:', error);
            throw new Error('Failed to fetch access token');
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            secure: true,
            auth: {
                type: 'OAuth2',
                user: this.configService.get<string>('MAIL_USER'),
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken
            },
            logger: true,
            debug: true,
        });

        return transporter;
    }
    

    async sendEmail(dto: SendEmailDTO) {
        const { from, recipients, subject, html, placeHolderReplacement } = dto;

        const transport = await this.getTransport();
        const options: Mail.Options = {
            from: from ?? {
                name: this.configService.get<string>('APP_NAME'),
                address: this.configService.get<string>('DEFAULT_MAIL_FROM'),
            },
            to: recipients,
            subject,
            html,
        };

    

        try {
            const result = await transport.sendMail(options);
            return result;
        } catch (error) {
            console.error('Error sending email:', error);
            throw new Error('Failed to send email');
        }
    }
    
}
