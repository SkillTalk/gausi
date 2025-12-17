import nodemailer from 'nodemailer';

export type EmailPayload = {
  subject: string;
  text?: string;
  html?: string;
};

function getTransport() {
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!host || !port || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

export async function sendEmail(payload: EmailPayload) {
  const to = process.env.EMAIL_TO || process.env.EMAIL_USER;
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const transport = getTransport();
  if (!transport || !to || !from) {
    // Fallback: log for development
    console.log('[EMAIL:FALLBACK]', { to, from, ...payload });
    return { ok: true, fallback: true };
  }
  const res = await transport.sendMail({
    from,
    to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html
  });
  return { ok: true, messageId: res.messageId };
}


