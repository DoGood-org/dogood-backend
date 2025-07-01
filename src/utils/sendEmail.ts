import { DOGOOD_EMAIL, DOGOOD_PASSWORD } from '@/config/env';
import nodemailer from 'nodemailer';

interface IEmailData {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

const nodemailerConfig = {
  host: 'ourmailserver.com',
  port: 465,
  secure: true,
  auth: {
    user: DOGOOD_EMAIL,
    pass: DOGOOD_PASSWORD,
  },
};
const transporter = nodemailer.createTransport(nodemailerConfig);

const sendMail = (data: IEmailData) => {
  const email = { ...data, from: DOGOOD_EMAIL };
  transporter.sendMail(email);
};

export default sendMail;
