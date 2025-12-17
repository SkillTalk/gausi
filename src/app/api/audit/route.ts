import { NextResponse } from 'next/server';
import { validateAudit } from '@/lib/validators';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const errors = validateAudit(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ message: 'Validation failed', errors }, { status: 400 });
    }
    // Email (fallback to console if not configured)
    const subject = `Free Audit: ${body.website} — ${body.name}`;
    const text = `Name: ${body.name}\nEmail: ${body.email}\nWebsite: ${body.website}\nGoals: ${body.goals || '-'}`;
    await sendEmail({ subject, text });
    return NextResponse.json({ message: 'Audit request received. We will email you soon.' });
  } catch (error) {
    console.error('[FREE AUDIT ERROR]', error);
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }
}


