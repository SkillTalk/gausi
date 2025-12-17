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
    // Log payload (no external email library)
    const subject = `Contact: ${body.name} — ${body.service || 'General'}`;
    const text = `Name: ${body.name}\nEmail: ${body.email}\nPhone: ${body.phone || '-'}\nService: ${body.service || '-'}\n\nMessage:\n${body.message}`;
    await sendEmail({ subject, text }); // logs only
    console.log('[CONTACT FORM]', body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[CONTACT ERROR]', error);
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }
}


