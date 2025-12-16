import { NextResponse } from 'next/server';
import { validateContact } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const errors = validateContact(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ message: 'Validation failed', errors }, { status: 400 });
    }
    // Placeholder: log to server console. Replace with Nodemailer or email service.
    console.log('[CONTACT FORM]', body);
    return NextResponse.json({ message: 'Message received. We will get back to you soon.' });
  } catch (error) {
    console.error('[CONTACT ERROR]', error);
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }
}


