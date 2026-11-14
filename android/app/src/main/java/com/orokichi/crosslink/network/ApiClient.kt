package com.orokichi.crosslink.network

import android.content.Context
import android.os.BatteryManager
import android.os.Build
import com.orokichi.crosslink.CrossLinkApp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

object ApiClient {

    /** Deployed web app. Users can override it in the app's pairing settings. */
    const val DEFAULT_SERVER_URL = "https://cross-link-three.vercel.app"

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

    fun getServerUrl(): String {
        return CrossLinkApp.prefs.getString("server_url", DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
    }

    fun getSessionCode(): String {
        return CrossLinkApp.prefs.getString("pairing_code", "") ?: ""
    }

    private inline fun Response.closeQuietly(block: (Response) -> Boolean): Boolean =
        use { block(it) }

    /** True when the pairing code exists on the server (used for a soft warning only). */
    suspend fun checkSession(code: String = getSessionCode()): Boolean = withContext(Dispatchers.IO) {
        val normalized = code.trim()
        if (normalized.isBlank()) return@withContext false
        val server = getServerUrl().trimEnd('/')
        try {
            val req = Request.Builder()
                .url("$server/api/session/$normalized/status")
                .get()
                .build()
            client.newCall(req).execute().closeQuietly { it.isSuccessful }
        } catch (e: Exception) {
            false
        }
    }

    suspend fun updateDeviceStatus(context: Context): Boolean = withContext(Dispatchers.IO) {
        val server = getServerUrl().trimEnd('/')
        val code = getSessionCode()
        if (code.isBlank()) return@withContext false

        val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val batteryLevel = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        val isCharging = bm.isCharging

        val json = JSONObject().apply {
            put("connected", true)
            put("deviceName", "${Build.MANUFACTURER} ${Build.MODEL}")
            put("model", Build.MODEL)
            put("batteryLevel", batteryLevel)
            put("isCharging", isCharging)
            put("networkType", "wifi")
        }

        try {
            val req = Request.Builder()
                .url("$server/api/session/$code/status")
                .post(json.toString().toRequestBody(JSON_MEDIA_TYPE))
                .build()
            client.newCall(req).execute().closeQuietly { it.isSuccessful }
        } catch (e: Exception) {
            false
        }
    }

    suspend fun sendMessage(type: String, data: JSONObject): Boolean = withContext(Dispatchers.IO) {
        val server = getServerUrl().trimEnd('/')
        val code = getSessionCode()
        if (code.isBlank()) return@withContext false

        val json = JSONObject().apply {
            put("type", type)
            put("data", data)
        }

        try {
            val req = Request.Builder()
                .url("$server/api/session/$code/message")
                .post(json.toString().toRequestBody(JSON_MEDIA_TYPE))
                .build()
            client.newCall(req).execute().closeQuietly { it.isSuccessful }
        } catch (e: Exception) {
            false
        }
    }

    suspend fun pollEvents(since: Long): Pair<Long, List<JSONObject>> = withContext(Dispatchers.IO) {
        val server = getServerUrl().trimEnd('/')
        val code = getSessionCode()
        if (code.isBlank()) return@withContext Pair(since, emptyList())

        try {
            val req = Request.Builder()
                .url("$server/api/session/$code/events?since=$since")
                .get()
                .build()
            val res = client.newCall(req).execute()
            if (!res.isSuccessful) {
                res.close()
                return@withContext Pair(since, emptyList())
            }

            val body = res.use { it.body?.string() } ?: return@withContext Pair(since, emptyList())
            val obj = JSONObject(body)
            val now = obj.optLong("now", since)
            val msgsJson = obj.optJSONArray("messages") ?: JSONArray()
            val result = mutableListOf<JSONObject>()
            for (i in 0 until msgsJson.length()) {
                val entry = msgsJson.getJSONObject(i)
                result.add(entry)
            }
            Pair(now, result)
        } catch (e: Exception) {
            Pair(since, emptyList())
        }
    }

    suspend fun uploadFile(file: File, mimeType: String): Boolean = withContext(Dispatchers.IO) {
        val server = getServerUrl().trimEnd('/')
        val code = getSessionCode()
        if (code.isBlank() || !file.exists()) return@withContext false

        try {
            val body = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("source", "phone")
                .addFormDataPart(
                    "file",
                    file.name,
                    file.readBytes().toRequestBody(mimeType.toMediaType())
                )
                .build()

            val req = Request.Builder()
                .url("$server/api/session/$code/upload")
                .post(body)
                .build()
            client.newCall(req).execute().closeQuietly { it.isSuccessful }
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Uploads one photo from the phone's media library.
     * [clientId] makes the upload idempotent: the web session keeps one copy per MediaStore entry.
     */
    suspend fun uploadPhoto(
        file: File,
        displayName: String,
        clientId: String,
        takenAt: Long,
        width: Int,
        height: Int
    ): Boolean = withContext(Dispatchers.IO) {
        val server = getServerUrl().trimEnd('/')
        val code = getSessionCode()
        if (code.isBlank() || !file.exists()) return@withContext false

        try {
            val body = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("source", "phone")
                .addFormDataPart("clientId", clientId)
                .addFormDataPart("name", displayName)
                .addFormDataPart("takenAt", takenAt.toString())
                .addFormDataPart("width", width.toString())
                .addFormDataPart("height", height.toString())
                .addFormDataPart(
                    "file",
                    displayName,
                    file.readBytes().toRequestBody("image/jpeg".toMediaType())
                )
                .build()

            val req = Request.Builder()
                .url("$server/api/session/$code/photos")
                .post(body)
                .build()
            client.newCall(req).execute().closeQuietly { it.isSuccessful }
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Client ids of the photos already synced to this session, or null when the
     * server could not be reached (in that case the caller syncs without de-dupe).
     */
    suspend fun fetchSyncedPhotoIds(): Set<String>? = withContext(Dispatchers.IO) {
        val server = getServerUrl().trimEnd('/')
        val code = getSessionCode()
        if (code.isBlank()) return@withContext emptySet()

        try {
            val req = Request.Builder()
                .url("$server/api/session/$code/photos")
                .get()
                .build()
            val res = client.newCall(req).execute()
            if (!res.isSuccessful) {
                res.close()
                return@withContext null
            }
            val body = res.use { it.body?.string() } ?: return@withContext null
            val items = JSONObject(body).optJSONArray("items") ?: JSONArray()
            val ids = mutableSetOf<String>()
            for (i in 0 until items.length()) {
                val clientId = items.getJSONObject(i).optString("clientId", "")
                if (clientId.isNotBlank()) ids.add(clientId)
            }
            ids
        } catch (e: Exception) {
            null
        }
    }
}
