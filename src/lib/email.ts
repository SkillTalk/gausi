export type EmailPayload = {
  subject: string;
  text?: string;
  html?: string;
};

// Lightweight logger stub to avoid bringing in nodemailer.
export async function sendEmail(payload: EmailPayload) {
  console.log('[EMAIL:LOG]', payload);
  return { ok: true, fallback: true };
}


