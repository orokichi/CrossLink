import { NextResponse } from 'next/server';
import {
  findPhotoByClientId,
  getSession,
  listPhotos,
  photoUsage,
  storePhoto,
  MAX_PHOTOS_PER_SESSION,
  MAX_SINGLE_PHOTO_BYTES,
} from '@/lib/sessionStore';
import { PhotoMeta } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/session/[id]/photos
 * Returns the photos synced for this pairing code, newest first.
 * The phone app uses `clientId` values to skip photos it already uploaded.
 */
export async function GET(req: Request, context: any) {
  const params = await context.params;
  const id = params.id;
  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
  }

  const usage = photoUsage(id);
  return NextResponse.json({
    ok: true,
    items: listPhotos(id),
    count: usage.count,
    bytes: usage.bytes,
    limit: MAX_PHOTOS_PER_SESSION,
    now: Date.now(),
  });
}

/**
 * POST /api/session/[id]/photos
 * Multipart upload used by the Android app (MediaStore sync) and by the web gallery.
 * Fields: file, source=phone|web, clientId?, name?, takenAt?, width?, height?
 */
export async function POST(req: Request, context: any) {
  const params = await context.params;
  const id = params.id;
  const session = getSession(id);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: 'Session not found. Check the pairing code on the web app.' },
      { status: 404 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: 'No photo uploaded' }, { status: 400 });
    }
    if (file.size > MAX_SINGLE_PHOTO_BYTES) {
      return NextResponse.json(
        { ok: false, error: `Photo is too large (max ${Math.round(MAX_SINGLE_PHOTO_BYTES / (1024 * 1024))}MB)` },
        { status: 413 }
      );
    }

    const source = (formData.get('source') as 'phone' | 'web') || 'phone';
    const clientId = (formData.get('clientId') as string) || undefined;
    const name = (formData.get('name') as string) || file.name || `photo_${Date.now()}.jpg`;
    const takenAtRaw = Number(formData.get('takenAt'));
    const widthRaw = Number(formData.get('width'));
    const heightRaw = Number(formData.get('height'));

    // Idempotent re-sync: the same MediaStore entry is not stored twice.
    if (clientId) {
      const existing = findPhotoByClientId(id, clientId);
      if (existing) {
        return NextResponse.json({ ok: true, photo: existing, duplicate: true });
      }
    }

    const photoId = Math.random().toString(36).substring(2, 10);
    const buffer = new Uint8Array(await file.arrayBuffer());

    const meta: PhotoMeta = {
      id: photoId,
      name,
      size: file.size,
      type: file.type || 'image/jpeg',
      width: Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : undefined,
      height: Number.isFinite(heightRaw) && heightRaw > 0 ? heightRaw : undefined,
      source,
      takenAt: Number.isFinite(takenAtRaw) && takenAtRaw > 0 ? takenAtRaw : Date.now(),
      clientId,
      url: `/api/session/${id}/photos/${photoId}`,
      timestamp: Date.now(),
    };

    const result = storePhoto(id, photoId, meta, buffer);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
    }

    return NextResponse.json({ ok: true, photo: meta });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
