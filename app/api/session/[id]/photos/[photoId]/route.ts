import { NextResponse } from 'next/server';
import { getStoredPhoto, removePhoto } from '@/lib/sessionStore';

export const dynamic = 'force-dynamic';

/** GET /api/session/[id]/photos/[photoId]?download=1 */
export async function GET(req: Request, context: any) {
  const params = await context.params;
  const { id, photoId } = params;
  const stored = getStoredPhoto(id, photoId);

  if (!stored) {
    return new NextResponse('Photo not found', { status: 404 });
  }

  const { meta, data } = stored;
  const { searchParams } = new URL(req.url);
  const download = searchParams.get('download') === '1';
  const safeName = encodeURIComponent(meta.name);

  const body = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': meta.type,
      'Content-Length': data.byteLength.toString(),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${safeName}"`,
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** DELETE /api/session/[id]/photos/[photoId] */
export async function DELETE(req: Request, context: any) {
  const params = await context.params;
  const { id, photoId } = params;
  const removed = removePhoto(id, photoId);
  if (!removed) {
    return NextResponse.json({ ok: false, error: 'Photo not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
