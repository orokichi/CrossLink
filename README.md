# 📱 CrossLink — Phone Link for Web

> **Windowsの「スマートフォン連携」のようなシームレスなデバイス連携を、ブラウザとAndroidアプリで実現するシステム。**  
> UIには最新の **Material 3 Expressive**（エクスプレッシブデザイン）を採用し、表現力豊かでモダンな操作感を提供します。

---

## ✨ 主な機能

### 1. 📋 リアルタイム クリップボード同期
- **双方向シームレス同期**: PCまたはAndroidスマホ側でテキストをコピーすると、瞬時に相手側のクリップボードへ反映。
- **同期履歴**: 直近のコピー履歴をカード一覧で表示し、ワンクリックで再コピー可能。
- **自動同期トグル**: 自動クリップボード上書きのオン/オフ切替対応。

### 2. 📁 クイックファイル共有 (Drop / Transfers)
- **ドラッグ＆ドロップ転送**: 写真、動画、PDF、テキストなどのファイルをPCブラウザへドラッグ＆ドロップするだけで即座に転送。
- **Androidからの共有**: Androidの共有メニュー（Intent）から直接PCへファイルを一瞬で送信。
- **ファイルプレビュー＆ダウンロード**: 受信したファイルを即座に保存可能。

### 3. 🔔 スマートフォン通知ミラーリング
- **リアルタイム通知表示**: LINE、X、メール、着信などの通知をPC画面上にリアルタイムでポップアップ表示。
- **通知管理**: 個別の通知の消去や全件クリアに対応。

### 4. 🎵 メディアコントロール & 端末を探す
- **再生中メディアの表示＆操作**: スマホで再生中の音楽・動画のタイトル・アーティストを表示し、PCから一時停止・再生・曲送り/曲戻し。
- **端末を探す (Ring Phone)**: 部屋の中でスマホが見当たらないとき、PCからワンクリックでスマートフォンの着信音とバイブレーションを作動。

---

## 🎨 UI デザイン: Material 3 Expressive
- **オーガニックなコンテナと角丸**: 大胆な曲率（Pill型、28px/18pxのコンテナ形状）
- **エクスプレッシブ・カラートークン**: Oceanic Emerald（Primary, Container, Surface Tint）
- **触覚的フィードバック**: スプリングアニメーションと触覚的なスケールトランジション
- **レスポンシブ・ダッシュボード**: スマートフォン連携風のデバイスステータスヘッダー（バッテリー残量・充電状態・Wi-Fi接続）

---

## 🛠 システム構成

```
CrossLink/
├── app/                  # Next.js 15 App Router (Webダッシュボード)
│   ├── api/session/      # シグナリング＆リレーAPI (Vercel Serverless)
│   ├── globals.css       # Material 3 Expressive トークン＆スタイル
│   ├── layout.tsx
│   └── page.tsx
├── components/           # UIコンポーネント (DeviceHeader, Clipboard, etc.)
├── lib/                  # セッション管理・型定義
├── android/              # Androidアプリ (Kotlin + Jetpack Compose)
│   ├── app/
│   │   ├── src/main/java/com/orokichi/crosslink/
│   │   │   ├── MainActivity.kt
│   │   │   ├── service/ConnectionService.kt
│   │   │   ├── service/CrossLinkNotificationListener.kt
│   │   │   └── ui/screens/MainScreen.kt
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
└── .github/workflows/    # GitHub Actions (APK自動ビルド＆Release発行)
```

---

## 🚀 デプロイと利用方法

### Webアプリ (Vercel)
本リポジトリはルートディレクトリがNext.jsプロジェクトとなっており、VercelとGitHubを連携することでゼロコンフィグで即座にデプロイされます。

### Androidアプリ (APK)
リポジトリの `main` ブランチにプッシュされると、GitHub Actionsが自動でKotlin/Composeアプリをコンパイルし、**GitHub Releases** に `CrossLink-v1.0.<run>.apk` として最新APKが公開されます。

1. ReleasesからAPKをダウンロードしてAndroid端末にインストール。
2. アプリを開き、Web画面に表示されている **6桁のペアリングコード** を入力して「接続開始」をタップ。
3. 通知アクセス権限を許可することで、完全な連携機能が有効になります。
