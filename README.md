# Illustration Todo

A Vite + React todo app with a Hono API server and Drizzle schema.

## Setup

```bash
npm install
npm run dev
```

The Vite client runs on `http://localhost:5173` and the API server runs on `http://localhost:8787`.

## Build
### 1. Supabaseの接続文字列を取得

Supabase Dashboardでプロジェクトを開き、**Connect** → **ORMs** または
**Database** → **Connect** からPostgres接続文字列を取得します。

VercelなどのServerless環境では、Transaction Pooler（ポート`6543`）の接続文字列を推奨します。
パスワードに記号が含まれる場合は、接続文字列内でURLエンコードしてください。

### 2. ローカル環境変数を設定

プロジェクト直下に`.env.local`を作成し、接続文字列を設定します。

```dotenv
SUPABASE_DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require
PORT=3001
```

接続文字列やパスワードはGitへコミットしないでください。

### 3. テーブルを作成


```bash
npm run db:push
npm run build
npm start
```
The Vite client runs on `http://localhost:5173` and the API server runs on `http://localhost:3001`.

### 4. Vercelへ設定

Vercel Dashboardの **Project Settings** → **Environment Variables** で、
`Production`環境に次の変数を登録します。

```text
SUPABASE_DATABASE_URL=SupabaseのPostgres接続文字列
```

登録後、Productionへ再デプロイしてください。`.env.local`はVercelへデプロイされません。

## Build

```bash
npm run build
npm start
```

本番サーバーはViteのビルドと`/api`エンドポイントを同一ポートで提供します。

## Environment variable

アプリとDrizzle Kitが使用する環境変数は`SUPABASE_DATABASE_URL`のみです。

```text
SUPABASE_DATABASE_URL  Supabase Postgresの接続文字列（必須）
PORT                  ローカルNodeサーバーのポート（任意、既定値3001）
```
