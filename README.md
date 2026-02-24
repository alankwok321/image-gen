# AI Image Generator

一個簡潔的 AI 圖片生成網頁應用，使用 OpenAI 相容 API 生成圖片。

## 功能

- 輸入文字描述（prompt），生成 AI 圖片
- 支援多種圖片尺寸（256×256、512×512、1024×1024）
- 可切換模型（nano-banana-pro / nano-banana2）
- 圖片下載
- 當前 session 生成歷史
- 深色主題、響應式設計

## 快速開始

### 本地開發

```bash
# 安裝依賴
npm install

# 設定環境變數
export OPENAI_BASE_URL="https://your-api-endpoint.com"
export OPENAI_API_KEY="your-api-key"

# 啟動伺服器
npm start
```

伺服器會在 `http://localhost:3000` 啟動。

### 部署到 Vercel

1. 推送到 GitHub
2. 在 Vercel 匯入專案
3. 在 Vercel 專案設定中加入環境變數：
   - `OPENAI_BASE_URL` — API 的 base URL（例如 `https://api.example.com`）
   - `OPENAI_API_KEY` — 你的 API 金鑰

> ⚠️ **重要：** 環境變數必須在 Vercel Dashboard → Settings → Environment Variables 中手動設定。

## 環境變數

| 變數名稱 | 說明 | 範例 |
|---|---|---|
| `OPENAI_BASE_URL` | API 伺服器的 base URL（不含 `/v1/...`） | `https://api.example.com` |
| `OPENAI_API_KEY` | API 認證金鑰 | `sk-xxxxx` |

## API 格式說明

本應用呼叫 OpenAI Images API 相容格式：

```
POST {OPENAI_BASE_URL}/v1/images/generations
```

**Request Body：**

```json
{
  "model": "nano-banana-pro",
  "prompt": "A cat sitting on a cloud",
  "n": 1,
  "size": "1024x1024"
}
```

**Response（預期格式）：**

```json
{
  "data": [
    {
      "url": "https://..."
    }
  ]
}
```

也支援 `b64_json` 格式的回應。

## 技術架構

- **前端：** 純 HTML + CSS + JavaScript（無框架）
- **後端：** Node.js + Express
- **部署：** Vercel（Serverless Functions）
- **API：** OpenAI Images API 相容格式

## 授權

MIT License
