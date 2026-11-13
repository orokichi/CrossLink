package com.orokichi.crosslink.service

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.app.NotificationCompat
import com.orokichi.crosslink.CrossLinkApp
import com.orokichi.crosslink.MainActivity
import com.orokichi.crosslink.R
import com.orokichi.crosslink.network.ApiClient
import kotlinx.coroutines.*
import org.json.JSONObject

class ConnectionService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var lastPollTime: Long = 0L
    private var lastCopiedText: String = ""

    private val clipListener = ClipboardManager.OnPrimaryClipChangedListener {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = clipboard.primaryClip
        if (clip != null && clip.itemCount > 0) {
            val text = clip.getItemAt(0).text?.toString() ?: ""
            if (text.isNotBlank() && text != lastCopiedText) {
                lastCopiedText = text
                serviceScope.launch {
                    val data = JSONObject().apply {
                        put("text", text)
                        put("source", "phone")
                    }
                    ApiClient.sendMessage("clipboard_sync", data)
                }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.addPrimaryClipChangedListener(clipListener)
        startForeground(1001, createNotification())
        startSyncLoops()
    }

    private fun createNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CrossLinkApp.CHANNEL_ID)
            .setContentTitle(getString(R.string.service_running_title))
            .setContentText(getString(R.string.service_running_desc))
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun startSyncLoops() {
        // Heartbeat & status loop (every 10 seconds)
        serviceScope.launch {
            while (isActive) {
                ApiClient.updateDeviceStatus(applicationContext)
                delay(10000)
            }
        }

        // Event polling loop (every 1.5 seconds)
        serviceScope.launch {
            while (isActive) {
                val (now, messages) = ApiClient.pollEvents(lastPollTime)
                lastPollTime = now
                for (entry in messages) {
                    val msgObj = entry.optJSONObject("message") ?: continue
                    val type = msgObj.optString("type")
                    val data = msgObj.optJSONObject("data") ?: JSONObject()

                    when (type) {
                        "clipboard_sync" -> {
                          val source = data.optString("source")
                          val text = data.optString("text")
                          if (source == "web" && text.isNotBlank() && text != lastCopiedText) {
                              lastCopiedText = text
                              val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                              val clip = ClipData.newPlainText("CrossLink", text)
                              clipboard.setPrimaryClip(clip)
                          }
                        }
                        "ring_phone" -> {
                          ringAndVibrate()
                        }
                    }
                }
                delay(1500)
            }
        }
    }

    private fun ringAndVibrate() {
        try {
            val notificationUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val ringtone = RingtoneManager.getRingtone(applicationContext, notificationUri)
            ringtone?.play()

            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(
                    VibrationEffect.createWaveform(
                        longArrayOf(0, 500, 200, 500, 200, 800),
                        -1
                    )
                )
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(2000)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.removePrimaryClipChangedListener(clipListener)
        serviceScope.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
