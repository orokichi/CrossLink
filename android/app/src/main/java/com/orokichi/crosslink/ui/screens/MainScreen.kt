package com.orokichi.crosslink.ui.screens

import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.orokichi.crosslink.CrossLinkApp
import com.orokichi.crosslink.network.ApiClient
import com.orokichi.crosslink.photos.PhotoLibrary
import com.orokichi.crosslink.photos.PhotoPermissions
import com.orokichi.crosslink.photos.PhotoSyncManager
import com.orokichi.crosslink.photos.PhotoSyncProgress
import com.orokichi.crosslink.service.ConnectionService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    onSelectFileToSend: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var serverUrl by remember {
        mutableStateOf(CrossLinkApp.prefs.getString("server_url", ApiClient.DEFAULT_SERVER_URL) ?: ApiClient.DEFAULT_SERVER_URL)
    }
    var pairingCode by remember {
        mutableStateOf(CrossLinkApp.prefs.getString("pairing_code", "") ?: "")
    }
    var isConnected by remember { mutableStateOf(false) }
    var pairingMessage by remember { mutableStateOf<String?>(null) }

    // Photo library state
    var hasPhotoAccess by remember { mutableStateOf(PhotoPermissions.hasAccess(context)) }
    var hasFullPhotoAccess by remember { mutableStateOf(PhotoPermissions.hasFullAccess(context)) }
    var photoAccessLabel by remember { mutableStateOf(PhotoPermissions.describe(context)) }
    var photoCount by remember { mutableStateOf(0) }
    var syncing by remember { mutableStateOf(false) }
    var syncMessage by remember { mutableStateOf<String?>(null) }
    var progress by remember { mutableStateOf<PhotoSyncProgress?>(null) }

    val photoPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) {
        hasPhotoAccess = PhotoPermissions.hasAccess(context)
        hasFullPhotoAccess = PhotoPermissions.hasFullAccess(context)
        photoAccessLabel = PhotoPermissions.describe(context)
    }

    LaunchedEffect(hasPhotoAccess) {
        photoCount = if (hasPhotoAccess) {
            withContext(Dispatchers.IO) { PhotoLibrary.countPhotos(context) }
        } else {
            0
        }
    }

    fun checkNotificationPermission(): Boolean {
        val enabledListeners = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners"
        )
        return enabledListeners?.contains(context.packageName) == true
    }

    var hasNotificationAccess by remember { mutableStateOf(checkNotificationPermission()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(MaterialTheme.colorScheme.primary),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.Link,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text("CrossLink", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            Text(
                                "Phone Link for Web",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Pairing Card (Material 3 Expressive)
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerHigh
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        "ペアリング設定",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "Webアプリの設定（歯車）に表示される6桁のコードを入力します",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = serverUrl,
                        onValueChange = {
                            serverUrl = it
                            CrossLinkApp.prefs.edit().putString("server_url", it.trim()).apply()
                        },
                        label = { Text("WebアプリのURL") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp)
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = pairingCode,
                        onValueChange = {
                            pairingCode = it.filter { ch -> ch.isDigit() }.take(6)
                            pairingMessage = null
                            CrossLinkApp.prefs.edit().putString("pairing_code", pairingCode).apply()
                        },
                        label = { Text("6桁のペアリングコード") },
                        placeholder = { Text("例: 123456") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp)
                    )

                    pairingMessage?.let { message ->
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            message,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.error
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            if (!isConnected) {
                                if (pairingCode.length != 6) {
                                    pairingMessage = "6桁のペアリングコードを入力してください"
                                    return@Button
                                }
                                CrossLinkApp.prefs.edit()
                                    .putString("pairing_code", pairingCode)
                                    .putString("server_url", serverUrl.trim().ifBlank { ApiClient.DEFAULT_SERVER_URL })
                                    .apply()
                                val intent = Intent(context, ConnectionService::class.java)
                                context.startForegroundService(intent)
                                isConnected = true
                                pairingMessage = null
                            } else {
                                val intent = Intent(context, ConnectionService::class.java)
                                context.stopService(intent)
                                isConnected = false
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = CircleShape,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isConnected) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Icon(
                            if (isConnected) Icons.Default.Close else Icons.Default.Check,
                            contentDescription = null
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            if (isConnected) "接続を切断する" else "PCと連携を開始",
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            // Photo library card
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerHigh
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(MaterialTheme.colorScheme.tertiaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.PhotoLibrary,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onTertiaryContainer,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                "写真ライブラリ",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                if (hasPhotoAccess) "$photoAccessLabel・$photoCount 枚" else "写真へのアクセスが必要です",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        "端末の写真をブラウザの「写真」タブに同期します（1回で最新20枚）。転送する写真は長辺1600pxに最適化され、元の写真は端末にそのまま残ります。",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    if (!hasPhotoAccess) {
                        Button(
                            onClick = {
                                photoPermissionLauncher.launch(PhotoPermissions.required())
                            },
                            modifier = Modifier.fillMaxWidth().height(46.dp),
                            shape = CircleShape,
                            colors = ButtonDefaults.filledTonalButtonColors()
                        ) {
                            Icon(Icons.Default.LockOpen, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("写真へのアクセスを許可")
                        }
                    } else {
                        if (syncing) {
                            val current = progress
                            Text(
                                if (current != null && current.total > 0) {
                                    "同期中… ${current.done} / ${current.total} 枚"
                                } else {
                                    "同期を準備しています…"
                                },
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            val ratio = if (current != null && current.total > 0) {
                                current.done.toFloat() / current.total.toFloat()
                            } else {
                                0f
                            }
                            LinearProgressIndicator(
                                progress = { ratio },
                                modifier = Modifier.fillMaxWidth().height(6.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                        }

                        Button(
                            onClick = {
                                if (syncing) return@Button
                                syncing = true
                                syncMessage = null
                                progress = null
                                scope.launch {
                                    val result = PhotoSyncManager.sync(context) { p ->
                                        progress = p
                                    }
                                    syncing = false
                                    syncMessage = result.message
                                }
                            },
                            enabled = !syncing && pairingCode.length == 6,
                            modifier = Modifier.fillMaxWidth().height(46.dp),
                            shape = CircleShape
                        ) {
                            Icon(Icons.Default.CloudUpload, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(if (syncing) "同期中…" else "最新の写真をPCへ同期")
                        }

                        if (pairingCode.length != 6) {
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                "上のペアリングコードを入力すると同期できます",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        if (!hasFullPhotoAccess) {
                            Spacer(modifier = Modifier.height(4.dp))
                            TextButton(
                                onClick = {
                                    photoPermissionLauncher.launch(PhotoPermissions.required())
                                }
                            ) {
                                Text("アクセスする写真を変更", fontSize = 12.sp)
                            }
                        }
                    }

                    syncMessage?.let { message ->
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            message,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            // Permissions Card
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainer
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        "権限と機能ステータス",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    // Notification Mirroring
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Notifications,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text("通知ミラーリング", fontWeight = FontWeight.SemiBold)
                                Text(
                                    if (hasNotificationAccess) "通知アクセス許可済み" else "許可が必要です",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        if (!hasNotificationAccess) {
                            FilledTonalButton(
                                onClick = {
                                    context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                                    hasNotificationAccess = checkNotificationPermission()
                                },
                                shape = CircleShape
                            ) {
                                Text("設定を開く", fontSize = 12.sp)
                            }
                        } else {
                            Text("✓ 有効", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                    // Clipboard Sync
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.ContentPaste,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text("リアルタイム クリップボード同期", fontWeight = FontWeight.SemiBold)
                            Text(
                                "コピーしたテキストをPCと自動送受信",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                    // Photo access status
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.PhotoLibrary,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text("写真ライブラリへのアクセス", fontWeight = FontWeight.SemiBold)
                            Text(
                                photoAccessLabel,
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            // Quick Actions
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainer
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        "クイック共有",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = onSelectFileToSend,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = CircleShape,
                        colors = ButtonDefaults.filledTonalButtonColors()
                    ) {
                        Icon(Icons.Default.FileUpload, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("ファイル・写真をPCへ送信")
                    }
                }
            }
        }
    }
}
