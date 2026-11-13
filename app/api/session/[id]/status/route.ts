import { NextResponse } from 'next/server';
import { getSession, pushMessage } from '@/lib/sessionStore';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, context: any) {
  const params = await context.params;
  const id = params.id;
  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
  }

  const isAlive = Date.now() - session.deviceStatus.lastSeen < 15000;
  const deviceStatus = {
    ...session.deviceStatus,
    connected: session.deviceStatus.connected && isAlive,
  };

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    code: session.code,
    deviceStatus,
  });
}

export async function POST(req: Request, context: any) {
  const params = await context.params;
  const id = params.id;
  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
  }

  const body = await req.json();
  pushMessage(id, { type: 'device_status', data: body });

  return NextResponse.json({ ok: true, deviceStatus: session.deviceStatus });
}
