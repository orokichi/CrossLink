import { NextResponse } from 'next/server';
import { getStoredFile } from '@/lib/sessionStore';

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await props.params;
  const stored = getStoredFile(id, fileId);

  if (!stored) {
    return new NextResponse('File not found', { status: 404 });
  }

  const { meta, data } = stored;

  const headers = new Headers();
  headers.set('Content-Type', meta.type);
  headers.set('Content-Length', data.byteLength.toString());
  headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(meta.name)}"`);

  return new NextResponse(data, { headers });
}
