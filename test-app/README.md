# 中間地点駅検索アプリ

複数人の最寄り駅を入力して、地理的な中心地点にある駅を見つけるWebアプリです。

## 機能

- 参加者（2〜5人）の最寄り駅を入力
- 駅名のオートコンプリート機能
- 地理的な中心地点を計算
- 中心地点から近い順に駅一覧を表示

## セットアップ

### 1. 環境変数の設定

`.env.local` ファイルをプロジェクトルートに作成し、以下を設定：

```bash
GOOGLE_MAPS_API_KEY=your_api_key_here
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**重要**: 地図表示にはクライアント側でもAPIキーが必要なため、`NEXT_PUBLIC_` プレフィックス付きの環境変数も設定してください。

**Google Maps Platform APIキーの取得:**
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「ライブラリ」から以下を有効化:
   - Geocoding API
   - Places API
   - Maps JavaScript API
4. 「認証情報」→「認証情報を作成」→「APIキー」

**Vercelへのデプロイ時:**
- Vercelダッシュボードで以下の環境変数を設定:
  - `GOOGLE_MAPS_API_KEY`
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`（同じ値）

### 2. 開発サーバーの起動

```bash
npm install
npm run dev
```

http://localhost:3000 で確認できます。

## 使い方

1. 参加者の最寄り駅を入力（オートコンプリートで候補が表示されます）
2. 「中心地点の駅を検索」ボタンをクリック
3. 中心地点から近い順に駅一覧が表示されます

## 注意事項

- **日本では Google Directions API の transit モード（電車）が使用できません**
- このアプリは**地理的な距離のみ**で中心地点を計算します
- 実際の移動時間や乗換案内は考慮していません

## 技術スタック

- Next.js 16
- TypeScript
- Tailwind CSS
- Google Maps Platform API
  - Places API (Autocomplete, Nearby Search)
  - Geocoding API
