# グルメマップ - 飲食店評価アプリ

個人的に訪れた飲食店の好み・評価をまとめるWebアプリです。

## 機能

- 🗺️ **地図表示**：登録した飲食店をGoogle Maps上にピン表示
- 📊 **ダッシュボード**：店名・評価・エリアを一覧表示
- 🔍 **検索・並べ替え**：評価順・エリア順などで並べ替え・絞り込み
- ➕ **新規追加・編集**：アプリ内のフォームから直接追加・編集
- 📱 **モバイル対応**：スマホのブラウザで開いても崩れないレスポンシブデザイン

## 技術スタック

- **フロントエンド**：React 18 + TypeScript
- **ビルドツール**：Vite
- **スタイリング**：Tailwind CSS
- **地図**：Google Maps JavaScript API
- **データベース**：Firebase Firestore
- **デプロイ**：Vercel

## セットアップ

### 1. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開いてください。

## CSVデータのインポート

Googleスプレッドシートから CSV でエクスポートしたデータをインポートする場合：

```bash
npm run import
```

このコマンドは以下の処理を行います：
- CSVファイルを読み込む
- 店名とエリアから自動で緯度経度を取得（Google Geocoding API）
- 取得失敗した店舗を表示

## デプロイ

### Vercel へのデプロイ

1. GitHub にコードをプッシュ
2. Vercel にサインイン
3. GitHub から リポジトリをインポート
4. 環境変数を設定（`.env.local` の内容）
5. デプロイ

### Google Cloud Console でセキュリティ設定

Maps API キーに HTTPリファラー制限を設定：

1. Google Cloud Console を開く
2. 認証情報 → API キー を選択
3. **ウェブサイトの制限**で、以下を追加：
   ```
   https://your-domain.vercel.app/*
   ```

## ディレクトリ構成

```
src/
├── components/        # React コンポーネント
│   ├── Map.tsx
│   ├── Dashboard.tsx
│   ├── AddRestaurantForm.tsx
│   └── RestaurantCard.tsx
├── lib/              # ユーティリティ関数
│   ├── firebase.ts
│   ├── geocoding.ts
│   └── db.ts
├── types/            # TypeScript 型定義
│   └── restaurant.ts
├── App.tsx
├── main.tsx
└── index.css

scripts/
└── import-restaurants.ts  # CSV インポートスクリプト
```

## トラブルシューティング

### 位置情報が取得できない店舗がある場合

`npm run import` 実行後、ログで失敗した店舗が表示されます。その場合：

1. ダッシュボードから該当店舗を「編集」
2. 緯度・経度を手動入力
3. 保存

### Maps API エラーが出る場合

- API キーが正しく設定されているか確認
- Google Cloud Console で Maps JavaScript API が有効になっているか確認
- HTTPリファラー制限の設定を確認

## ライセンス

MIT
