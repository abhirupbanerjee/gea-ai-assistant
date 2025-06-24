import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail({ to, subject, text }: { to: string, subject: string, text: string }) {
  const msg = {
    to,
    from: process.env.SENDGRID_SENDER!,
    subject,
    text
  };

  try {
    const response = await sgMail.send(msg);
    return {
      status: 'sent',
      messageId: response[0]?.headers['x-message-id'] || null
    };
  } catch (error: any) {
    console.error('SendGrid error:', error.response?.body || error.message);
    return { status: 'error', error: error.message };
  }
}
