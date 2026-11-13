import { NextResponse } from 'next/server';
import { getSession, getMessagesSince } from '@/lib/sessionStore';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, context: any) {
  const params = await context.params;
  const id = params.id;
  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const since = parseInt(searchParams.get('since') || '0', 10);

  const messages = getMessagesSince(id, since);
  const isAlive = Date.now() - session.deviceStatus.lastSeen < 15000;

  return NextResponse.json({
    ok: true,
    messages,
    connected: session.deviceStatus.connected && isAlive,
    deviceStatus: {
      ...session.deviceStatus,
      connected: session.deviceStatus.connected && isAlive,
    },
    now: Date.now(),
  });
}
