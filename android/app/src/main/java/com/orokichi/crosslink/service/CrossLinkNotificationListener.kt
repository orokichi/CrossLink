package com.orokichi.crosslink.service

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.orokichi.crosslink.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject

class CrossLinkNotificationListener : NotificationListenerService() {

    private val listenerScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        sbn ?: return

        // Ignore ongoing / foreground service notifications and own notifications
        if (sbn.isOngoing || sbn.packageName == packageName) return

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        if (title.isBlank() && text.isBlank()) return

        val appName = try {
            val pm = packageManager
            val appInfo = pm.getApplicationInfo(sbn.packageName, 0)
            pm.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
            sbn.packageName
        }

        listenerScope.launch {
            val data = JSONObject().apply {
                put("id", "${sbn.packageName}_${sbn.id}")
                put("packageName", sbn.packageName)
                put("appName", appName)
                put("title", title)
                put("text", text)
                put("timestamp", sbn.postTime)
            }
            ApiClient.sendMessage("notification_posted", data)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
        sbn ?: return

        listenerScope.launch {
            val data = JSONObject().apply {
                put("id", "${sbn.packageName}_${sbn.id}")
            }
            ApiClient.sendMessage("notification_removed", data)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        listenerScope.cancel()
    }
}
