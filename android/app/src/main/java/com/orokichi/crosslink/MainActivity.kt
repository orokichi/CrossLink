package com.orokichi.crosslink

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import com.orokichi.crosslink.network.ApiClient
import com.orokichi.crosslink.ui.screens.MainScreen
import com.orokichi.crosslink.ui.theme.CrossLinkTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

class MainActivity : ComponentActivity() {

    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { uploadUriFile(it) }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Request notification permission on Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 101)
        }

        // Handle incoming SEND Intent (sharing from other apps)
        if (intent?.action == Intent.ACTION_SEND) {
            val uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra(Intent.EXTRA_STREAM)
            }
            uri?.let { uploadUriFile(it) }
        }

        setContent {
            CrossLinkTheme {
                MainScreen(
                    onSelectFileToSend = {
                        filePickerLauncher.launch("*/*")
                    }
                )
            }
        }
    }

    private fun uploadUriFile(uri: Uri) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val inputStream = contentResolver.openInputStream(uri) ?: return@launch
                val mimeType = contentResolver.getType(uri) ?: "application/octet-stream"
                val fileName = "shared_${System.currentTimeMillis()}"

                val tempFile = File(cacheDir, fileName)
                FileOutputStream(tempFile).use { out ->
                    inputStream.copyTo(out)
                }

                val ok = ApiClient.uploadFile(tempFile, mimeType)
                tempFile.delete()

                withContext(Dispatchers.Main) {
                    Toast.makeText(
                        this@MainActivity,
                        if (ok) "PCへファイルを送信しました！" else "ファイル送信に失敗しました",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@MainActivity, "エラー: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}
