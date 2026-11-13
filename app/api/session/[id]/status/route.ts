import { NextResponse } from 'next/server';
import { getSession, pushMessage } from '@/lib/sessionStore';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
  }

  // Check if device is connected based on heartbeat within last 15 seconds
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

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
  }

  const body = await req.json();
  pushMessage(id, { type: 'device_status', data: body });

  return NextResponse.json({ ok: true, deviceStatus: session.deviceStatus });
}
