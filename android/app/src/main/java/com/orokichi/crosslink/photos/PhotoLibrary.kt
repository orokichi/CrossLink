package com.orokichi.crosslink.photos

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.core.content.ContextCompat
import androidx.exifinterface.media.ExifInterface
import java.io.File
import java.io.FileOutputStream

/** One entry from the phone's media library. */
data class PhonePhoto(
    val id: Long,
    val uri: Uri,
    val name: String,
    val mimeType: String,
    val size: Long,
    val dateTaken: Long,
    val width: Int,
    val height: Int
) {
    /** Stable identity used by the server to skip photos that were already uploaded. */
    val clientId: String get() = "$id:$dateTaken"
}

/**
 * READ_MEDIA_IMAGES on Android 13+, READ_EXTERNAL_STORAGE up to Android 12.
 * Android 14 can also grant access to a user-selected subset of photos.
 */
object PhotoPermissions {

    fun required(): Array<String> = when {
        Build.VERSION.SDK_INT >= 34 -> arrayOf(
            Manifest.permission.READ_MEDIA_IMAGES,
            Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED
        )
        Build.VERSION.SDK_INT >= 33 -> arrayOf(Manifest.permission.READ_MEDIA_IMAGES)
        else -> arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
    }

    /** Label for the current grant so the UI can explain partial access. */
    fun describe(context: Context): String {
        val full = when {
            Build.VERSION.SDK_INT >= 33 -> granted(context, Manifest.permission.READ_MEDIA_IMAGES)
            else -> granted(context, Manifest.permission.READ_EXTERNAL_STORAGE)
        }
        if (full) return "すべての写真にアクセスできます"
        if (Build.VERSION.SDK_INT >= 34 && granted(context, Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED)) {
            return "選択した写真のみアクセスできます"
        }
        return "許可が必要です"
    }

    fun hasAccess(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= 33 && granted(context, Manifest.permission.READ_MEDIA_IMAGES)) return true
        if (Build.VERSION.SDK_INT >= 34 &&
            granted(context, Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED)
        ) return true
        if (Build.VERSION.SDK_INT < 33 && granted(context, Manifest.permission.READ_EXTERNAL_STORAGE)) return true
        return false
    }

    /** Full library access (Android 14 can grant only a user-selected subset instead). */
    fun hasFullAccess(context: Context): Boolean = when {
        Build.VERSION.SDK_INT >= 33 -> granted(context, Manifest.permission.READ_MEDIA_IMAGES)
        else -> granted(context, Manifest.permission.READ_EXTERNAL_STORAGE)
    }

    private fun granted(context: Context, permission: String): Boolean =
        ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
}

/**
 * Reads the phone's photo library through MediaStore and prepares JPEG copies
 * that are small enough for the browser gallery (long edge 1600px, quality 82).
 */
object PhotoLibrary {

    const val MAX_DIMENSION = 1600
    private const val JPEG_QUALITY = 82

    private val PROJECTION = arrayOf(
        MediaStore.Images.Media._ID,
        MediaStore.Images.Media.DISPLAY_NAME,
        MediaStore.Images.Media.MIME_TYPE,
        MediaStore.Images.Media.DATE_TAKEN,
        MediaStore.Images.Media.DATE_MODIFIED,
        MediaStore.Images.Media.SIZE,
        MediaStore.Images.Media.WIDTH,
        MediaStore.Images.Media.HEIGHT
    )

    /** Newest first, at most [limit] entries. */
    fun queryRecent(context: Context, limit: Int = 200): List<PhonePhoto> {
        if (!PhotoPermissions.hasAccess(context)) return emptyList()
        val collection = if (Build.VERSION.SDK_INT >= 29) {
            MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
        } else {
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        }

        val result = mutableListOf<PhonePhoto>()
        try {
            context.contentResolver.query(
                collection,
                PROJECTION,
                null,
                null,
                "${MediaStore.Images.Media.DATE_TAKEN} DESC, ${MediaStore.Images.Media.DATE_MODIFIED} DESC"
            )?.use { cursor ->
                val idCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
                val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
                val mimeCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.MIME_TYPE)
                val takenCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN)
                val modifiedCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_MODIFIED)
                val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE)
                val widthCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.WIDTH)
                val heightCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.HEIGHT)

                while (cursor.moveToNext() && result.size < limit) {
                    val id = cursor.getLong(idCol)
                    val taken = cursor.getLong(takenCol)
                    val modified = cursor.getLong(modifiedCol)
                    val dateTaken = if (taken > 0) taken else modified * 1000L
                    val mime = cursor.getString(mimeCol) ?: "image/jpeg"
                    // Only still images the browser can display.
                    if (!mime.startsWith("image/") || mime.contains("gif")) continue
                    result.add(
                        PhonePhoto(
                            id = id,
                            uri = Uri.withAppendedPath(collection, id.toString()),
                            name = cursor.getString(nameCol) ?: "photo_$id.jpg",
                            mimeType = mime,
                            size = cursor.getLong(sizeCol),
                            dateTaken = dateTaken,
                            width = cursor.getInt(widthCol),
                            height = cursor.getInt(heightCol)
                        )
                    )
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return result
    }

    fun countPhotos(context: Context): Int {
        if (!PhotoPermissions.hasAccess(context)) return 0
        val collection = if (Build.VERSION.SDK_INT >= 29) {
            MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
        } else {
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        }
        return try {
            context.contentResolver.query(
                collection,
                arrayOf(MediaStore.Images.Media._ID),
                null,
                null,
                null
            )?.use { it.count } ?: 0
        } catch (e: Exception) {
            0
        }
    }

    /**
     * Writes a browser-friendly JPEG into the cache directory.
     * Returns null when the image cannot be decoded (or is too large for memory).
     */
    fun createUploadFile(context: Context, photo: PhonePhoto, maxDimension: Int = MAX_DIMENSION): File? {
        return try {
            val bitmap = decodeScaled(context, photo.uri, maxDimension) ?: return null
            val rotated = applyExifRotation(context, photo.uri, bitmap)
            val file = File(context.cacheDir, "crosslink_photo_${photo.id}.jpg")
            FileOutputStream(file).use { out ->
                rotated.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, out)
            }
            if (rotated !== bitmap) bitmap.recycle()
            rotated.recycle()
            if (file.length() == 0L) {
                file.delete()
                null
            } else {
                file
            }
        } catch (e: OutOfMemoryError) {
            e.printStackTrace()
            null
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun dimensionsOf(context: Context, photo: PhonePhoto, maxDimension: Int = MAX_DIMENSION): Pair<Int, Int> {
        val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        try {
            context.contentResolver.openInputStream(photo.uri)?.use {
                BitmapFactory.decodeStream(it, null, options)
            }
        } catch (e: Exception) {
            return photo.width to photo.height
        }
        if (options.outWidth <= 0 || options.outHeight <= 0) return photo.width to photo.height
        val scale = minOf(
            maxDimension.toFloat() / options.outWidth,
            maxDimension.toFloat() / options.outHeight,
            1f
        )
        return (options.outWidth * scale).toInt().coerceAtLeast(1) to
            (options.outHeight * scale).toInt().coerceAtLeast(1)
    }

    private fun decodeScaled(context: Context, uri: Uri, maxDimension: Int): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        context.contentResolver.openInputStream(uri)?.use {
            BitmapFactory.decodeStream(it, null, bounds)
        }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        var sampleSize = 1
        while (bounds.outWidth / (sampleSize * 2) >= maxDimension &&
            bounds.outHeight / (sampleSize * 2) >= maxDimension
        ) {
            sampleSize *= 2
        }

        val options = BitmapFactory.Options().apply { inSampleSize = sampleSize }
        val decoded = context.contentResolver.openInputStream(uri)?.use {
            BitmapFactory.decodeStream(it, null, options)
        } ?: return null

        val scale = listOf(
            maxDimension.toFloat() / decoded.width,
            maxDimension.toFloat() / decoded.height,
            1f
        ).minOrNull() ?: 1f
        if (scale >= 1f) return decoded

        val targetWidth = (decoded.width * scale).toInt().coerceAtLeast(1)
        val targetHeight = (decoded.height * scale).toInt().coerceAtLeast(1)
        val scaled = Bitmap.createScaledBitmap(decoded, targetWidth, targetHeight, true)
        if (scaled !== decoded) decoded.recycle()
        return scaled
    }

    private fun applyExifRotation(context: Context, uri: Uri, bitmap: Bitmap): Bitmap {
        val orientation = try {
            context.contentResolver.openInputStream(uri)?.use {
                ExifInterface(it).getAttributeInt(
                    ExifInterface.TAG_ORIENTATION,
                    ExifInterface.ORIENTATION_NORMAL
                )
            } ?: ExifInterface.ORIENTATION_NORMAL
        } catch (e: Exception) {
            ExifInterface.ORIENTATION_NORMAL
        }

        val matrix = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
            ExifInterface.ORIENTATION_TRANSPOSE -> {
                matrix.postRotate(90f); matrix.postScale(-1f, 1f)
            }
            ExifInterface.ORIENTATION_TRANSVERSE -> {
                matrix.postRotate(270f); matrix.postScale(-1f, 1f)
            }
            else -> return bitmap
        }
        return try {
            val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
            if (rotated !== bitmap) bitmap.recycle()
            rotated
        } catch (e: Exception) {
            bitmap
        }
    }
}
