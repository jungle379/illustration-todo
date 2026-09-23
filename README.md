## cal-app
- 家族の予定を共有できるカレンダーアプリ

## 使用した技術
- React(Next.js)
- Supabase
- Mantine
- TanstackQuery
- zod

## 機能
- 登録・編集・削除(個別削除、一括削除)

## 環境変数

プロジェクト直下の`.env.local`に以下を設定してください。

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_DATABASE_URL=postgresql://...
```

`NEXT_PUBLIC_SUPABASE_URL`と`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`は、
Supabase Dashboardの **Project Settings → API** から取得します。
設定後に開発サーバーを再起動してください。
