import { NextResponse } from 'next/server';
import { getSession, storeFile } from '@/lib/sessionStore';
import { SharedFile } from '@/lib/types';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const source = (formData.get('source') as 'phone' | 'web') || 'web';

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 });
    }

    const fileId = Math.random().toString(36).substring(2, 10);
    const buffer = new Uint8Array(await file.arrayBuffer());

    const meta: SharedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      source,
      downloadUrl: `/api/session/${id}/files/${fileId}`,
      timestamp: Date.now(),
    };

    storeFile(id, fileId, meta, buffer);

    return NextResponse.json({ ok: true, file: meta });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
