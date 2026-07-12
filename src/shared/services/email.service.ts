import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly defaultFrom: string;

  constructor(private readonly configService: ConfigService) {
    const smtpHost = this.configService.getOrThrow<string>('SMTP_HOST');
    const smtpPort = this.configService.getOrThrow<number>('SMTP_PORT');
    const smtpUser = this.configService.getOrThrow<string>('SMTP_USER');
    const smtpPass = this.configService.getOrThrow<string>('SMTP_PASS');
    this.defaultFrom =
      this.configService.get<string>('SMTP_FROM') ||
      'DoGood <noreply@dogood.com>';

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    void this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection established successfully');
    } catch (error) {
      this.logger.error('Failed to establish SMTP connection:', error);
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      const info: { messageId: string } = await this.transporter.sendMail({
        from: options.from || this.defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      this.logger.log(
        `Email sent successfully to ${options.to}: ${info.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }
}
