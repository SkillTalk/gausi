import { NextResponse } from 'next/server';
import { validateContact } from '@/lib/validators';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const errors = validateContact(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ message: 'Validation failed', errors }, { status: 400 });
    }
    // Email (fallback to console if not configured)
    const subject = `Contact: ${body.name} — ${body.service || 'General'}`;
    const text = `Name: ${body.name}\nEmail: ${body.email}\nPhone: ${body.phone || '-'}\nService: ${body.service || '-'}\n\nMessage:\n${body.message}`;
    await sendEmail({ subject, text });
    return NextResponse.json({ message: 'Message received. We will get back to you soon.' });
  } catch (error) {
    console.error('[CONTACT ERROR]', error);
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }
}


