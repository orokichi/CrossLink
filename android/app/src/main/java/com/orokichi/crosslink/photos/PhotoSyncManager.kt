package com.orokichi.crosslink.photos

import android.content.Context
import com.orokichi.crosslink.network.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Progress of one photo sync run. */
data class PhotoSyncProgress(
    val done: Int,
    val total: Int,
    val uploaded: Int,
    val failed: Int
)

data class PhotoSyncResult(
    val ok: Boolean,
    val found: Int,
    val uploaded: Int,
    val skipped: Int,
    val failed: Int,
    val message: String
)

/**
 * Uploads the newest photos of the device to the paired web session.
 * Photos that the session already holds (same MediaStore id + date) are skipped,
 * and each upload is downscaled so a phone album of several MB photos still fits
 * the browser gallery and the server limits.
 */
object PhotoSyncManager {

    const val BATCH_LIMIT = 20

    suspend fun sync(
        context: Context,
        limit: Int = BATCH_LIMIT,
        onProgress: (PhotoSyncProgress) -> Unit = {}
    ): PhotoSyncResult = withContext(Dispatchers.IO) {
        val code = ApiClient.getSessionCode()
        if (code.isBlank()) {
            return@withContext PhotoSyncResult(
                ok = false, found = 0, uploaded = 0, skipped = 0, failed = 0,
                message = "ペアリングコードを入力してから同期してください"
            )
        }
        if (!PhotoPermissions.hasAccess(context)) {
            return@withContext PhotoSyncResult(
                ok = false, found = 0, uploaded = 0, skipped = 0, failed = 0,
                message = "写真へのアクセスが許可されていません"
            )
        }

        val photos = PhotoLibrary.queryRecent(context, limit = limit * 4)
        if (photos.isEmpty()) {
            return@withContext PhotoSyncResult(
                ok = true, found = 0, uploaded = 0, skipped = 0, failed = 0,
                message = "端末に同期できる写真が見つかりませんでした"
            )
        }

        val alreadySynced = ApiClient.fetchSyncedPhotoIds() ?: emptySet()
        val pending = photos.filter { it.clientId !in alreadySynced }.take(limit)
        val skipped = photos.count { it.clientId in alreadySynced }

        if (pending.isEmpty()) {
            return@withContext PhotoSyncResult(
                ok = true, found = photos.size, uploaded = 0, skipped = skipped, failed = 0,
                message = "最新の写真はすでに同期済みです（${skipped}枚）"
            )
        }

        var uploaded = 0
        var failed = 0
        onProgress(PhotoSyncProgress(0, pending.size, 0, 0))

        pending.forEachIndexed { index, photo ->
            val file = PhotoLibrary.createUploadFile(context, photo)
            if (file == null) {
                failed++
            } else {
                val (width, height) = PhotoLibrary.dimensionsOf(context, photo)
                val ok = ApiClient.uploadPhoto(
                    file = file,
                    displayName = photo.name,
                    clientId = photo.clientId,
                    takenAt = photo.dateTaken,
                    width = width,
                    height = height
                )
                file.delete()
                if (ok) uploaded++ else failed++
            }
            onProgress(PhotoSyncProgress(index + 1, pending.size, uploaded, failed))
        }

        val message = when {
            uploaded > 0 && failed == 0 -> "${uploaded}枚の写真を同期しました"
            uploaded > 0 -> "${uploaded}枚を同期、${failed}枚は失敗しました"
            else -> "写真を同期できませんでした。接続とコードを確認してください"
        }

        PhotoSyncResult(
            ok = uploaded > 0,
            found = photos.size,
            uploaded = uploaded,
            skipped = skipped,
            failed = failed,
            message = message
        )
    }
}
