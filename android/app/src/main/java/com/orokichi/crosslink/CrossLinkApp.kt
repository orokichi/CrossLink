package com.orokichi.crosslink

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.SharedPreferences
import android.os.Build

class CrossLinkApp : Application() {

    companion object {
        const val CHANNEL_ID = "crosslink_service_channel"
        lateinit var prefs: SharedPreferences
            private set
    }

    override fun onCreate() {
        super.onCreate()
        prefs = getSharedPreferences("crosslink_settings", Context.MODE_PRIVATE)
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.notification_channel_desc)
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
