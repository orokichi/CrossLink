import { NextResponse } from 'next/server';
import { createSession } from '@/lib/sessionStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const session = createSession(body.code);
    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      code: session.code,
      deviceStatus: session.deviceStatus,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
