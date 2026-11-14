import { NextResponse } from 'next/server';
import { getStoredFile } from '@/lib/sessionStore';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, context: any) {
  const params = await context.params;
  const { id, fileId } = params;
  const stored = getStoredFile(id, fileId);

  if (!stored) {
    return new NextResponse('File not found', { status: 404 });
  }

  const { meta, data } = stored;
  const body = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': meta.type,
      'Content-Length': data.byteLength.toString(),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(meta.name)}"`,
    },
  });
}
