import { NextResponse } from 'next/server';
import { getSession, pushMessage } from '@/lib/sessionStore';
import { CrossLinkMessage } from '@/lib/types';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
  }

  const message: CrossLinkMessage = await req.json();
  pushMessage(id, message);

  return NextResponse.json({ ok: true });
}
