const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API endpoint: generate image via OpenAI-compatible API
app.post("/api/generate", async (req, res) => {
  const baseUrl = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!baseUrl || !apiKey) {
    return res.status(500).json({
      error: {
        message: "Server is not configured. OPENAI_BASE_URL and OPENAI_API_KEY environment variables are required.",
      },
    });
  }

  const { prompt, size, model } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({
      error: { message: "Prompt is required." },
    });
  }

  try {
    // Build the API URL — strip trailing slash and /v1 if already present
    const cleanBase = baseUrl.replace(/\/+$/, "").replace(/\/v1$/, "");
    const url = cleanBase + "/v1/images/generations";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "nano-banana-pro",
        prompt: prompt.trim(),
        n: 1,
        size: size || "1024x1024",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (err) {
    console.error("Image generation error:", err);
    res.status(500).json({
      error: { message: "Failed to connect to the image generation API." },
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Serve index.html for all other routes (SPA fallback)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
