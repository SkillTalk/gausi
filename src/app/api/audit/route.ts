import { NextResponse } from 'next/server';
import { validateAudit } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const errors = validateAudit(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ message: 'Validation failed', errors }, { status: 400 });
    }
    // Placeholder: log to server console. Replace with email integration.
    console.log('[FREE AUDIT REQUEST]', body);
    return NextResponse.json({ message: 'Audit request received. We will email you soon.' });
  } catch (err) {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }
}


