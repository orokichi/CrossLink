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

### 4. 🖼 写真ライブラリの閲覧 (Photos)
- **スマホの写真をブラウザで**: Androidアプリで写真へのアクセスを許可すると、端末の最新写真がセッションへ同期され、Webの「写真」タブにグリッド表示されます。
- **拡大＆ダウンロード**: サムネイルをタップするとライトボックスで拡大表示（←→キー対応）、そのままダウンロードできます。
- **軽量な同期**: 転送時に長辺1600px・JPEG品質82に最適化。一度送った写真は MediaStore のIDで判定され二重に送られません。

### 5. 🎵 メディアコントロール & 端末を探す
- **再生中メディアの表示＆操作**: スマホで再生中の音楽・動画のタイトル・アーティストを表示し、PCから一時停止・再生・曲送り/曲戻し。
- **端末を探す (Ring Phone)**: 部屋の中でスマホが見当たらないとき、PCからワンクリックでスマートフォンの着信音とバイブレーションを作動。

### 6. 📲 PWA & 初期設定ウィザード
- **アプリとしてインストール**: `manifest.webmanifest` + Service Worker（オフラインキャッシュ）で、Chrome/Edge/Androidはインストールボタン、iOS Safariは「ホーム画面に追加」の手順ガイドを表示。
- **初回起動の初期設定**: ①ペアリングコードの共有 → ②通知権限の許可 → ③写真ライブラリの接続 → ④機能チュートリアル、の4ステップ。完了状態は端末に保存され、設定（歯車）からいつでも再表示できます。

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
│   ├── manifest.ts       # PWAマニフェスト (/manifest.webmanifest)
│   ├── globals.css       # Material 3 Expressive トークン＆スタイル
│   ├── layout.tsx        # メタデータ・apple-mobile-web-app設定
│   └── page.tsx
├── components/           # UIコンポーネント (Onboarding, PhotoGallery, PwaInstall, etc.)
├── lib/                  # セッション管理・型定義
├── public/
│   ├── sw.js             # Service Worker (オフラインキャッシュ)
│   └── icons/            # PWAアイコン (192/512/maskable/apple-touch)
├── scripts/generate-icons.py  # アイコン生成スクリプト
├── android/              # Androidアプリ (Kotlin + Jetpack Compose)
│   ├── app/
│   │   ├── src/main/java/com/orokichi/crosslink/
│   │   │   ├── MainActivity.kt
│   │   │   ├── photos/PhotoLibrary.kt      # MediaStore読み出し・画像最適化
│   │   │   ├── photos/PhotoSyncManager.kt  # 写真の同期
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
4. 「写真へのアクセスを許可」→「最新の写真をPCへ同期」で、Webの「写真」タブに端末の写真が並びます。

### WebアプリをPWAとしてインストール
初回アクセス時の初期設定ウィザード、または右上の設定（歯車）→「アプリとしてインストール」から追加できます。iOSはSafariの共有メニュー →「ホーム画面に追加」を使用します。
