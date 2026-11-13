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
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

object ApiClient {

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

    fun getServerUrl(): String {
        return CrossLinkApp.prefs.getString("server_url", "https://crosslink-web.vercel.app") ?: "https://crosslink-web.vercel.app"
    }

    fun getSessionCode(): String {
        return CrossLinkApp.prefs.getString("pairing_code", "") ?: ""
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
            val res = client.newCall(req).execute()
            res.isSuccessful
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
            val res = client.newCall(req).execute()
            res.isSuccessful
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
            if (!res.isSuccessful) return@withContext Pair(since, emptyList())

            val body = res.body?.string() ?: return@withContext Pair(since, emptyList())
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
            val res = client.newCall(req).execute()
            res.isSuccessful
        } catch (e: Exception) {
            false
        }
    }
}
