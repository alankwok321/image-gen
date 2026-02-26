const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Scene narrative beats for storytelling
const SCENE_BEATS = [
  "establishing shot, wide angle, setting the scene",
  "introduction of the main subject, medium shot",
  "rising action, building tension or interest",
  "climactic moment, dramatic composition",
  "development and detail, close-up perspective",
  "turning point, shift in mood or atmosphere",
  "resolution beginning, pulling back",
  "final scene, satisfying conclusion, wide shot",
];

// Helper: call the image generation API
async function generateSingleImage(prompt, model) {
  const baseUrl = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;

  const cleanBase = baseUrl.replace(/\/+$/, "");
  const url = cleanBase + "/chat/completions";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "gemini-3-pro-image-preview",
      messages: [
        {
          role: "user",
          content: "Generate an image: " + prompt,
        },
      ],
      max_tokens: 4096,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "API returned status " + response.status);
  }

  const content = data.choices?.[0]?.message?.content || "";
  const imageMatch = content.match(/!\[.*?\]\(((?:https?:\/\/|data:image\/)[^\s)]+)\)/);

  if (imageMatch) {
    return { url: imageMatch[1] };
  } else {
    throw new Error("No image generated. Model said: " + content.substring(0, 200));
  }
}

// API endpoint: generate single image via chat completions
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

  const { prompt, model } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({
      error: { message: "Prompt is required." },
    });
  }

  try {
    const cleanBase = baseUrl.replace(/\/+$/, "");
    const url = cleanBase + "/chat/completions";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: "Generate an image: " + prompt.trim(),
          },
        ],
        max_tokens: 4096,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Extract image URL from markdown in response
    const content = data.choices?.[0]?.message?.content || "";
    const imageMatch = content.match(/!\[.*?\]\(((?:https?:\/\/|data:image\/)[^\s)]+)\)/);

    if (imageMatch) {
      res.json({
        created: data.created,
        data: [{ url: imageMatch[1] }],
        model: data.model,
        raw_content: content,
      });
    } else {
      res.json({
        created: data.created,
        data: [],
        model: data.model,
        raw_content: content,
        error: { message: "No image was generated. Model response: " + content.substring(0, 200) },
      });
    }
  } catch (err) {
    console.error("Image generation error:", err);
    res.status(500).json({
      error: { message: "Failed to connect to the image generation API." },
    });
  }
});

// API endpoint: generate multiple scene images (streamed as NDJSON)
app.post("/api/generate-scenes", async (req, res) => {
  const baseUrl = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!baseUrl || !apiKey) {
    return res.status(500).json({
      error: {
        message: "Server is not configured. OPENAI_BASE_URL and OPENAI_API_KEY environment variables are required.",
      },
    });
  }

  const { prompt, sceneCount, model } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({
      error: { message: "Prompt is required." },
    });
  }

  const count = Math.min(Math.max(parseInt(sceneCount) || 5, 2), 8);

  // Stream results as NDJSON so frontend can show progress
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const results = [];

  for (let i = 0; i < count; i++) {
    const beat = SCENE_BEATS[Math.floor((i / count) * SCENE_BEATS.length)];
    const scenePrompt = `Scene ${i + 1} of ${count}: ${prompt.trim()} — ${beat}`;

    try {
      const img = await generateSingleImage(scenePrompt, model);
      const payload = { index: i, total: count, url: img.url, status: "ok" };
      results.push(payload);
      res.write(JSON.stringify(payload) + "\n");
    } catch (err) {
      const payload = { index: i, total: count, error: err.message, status: "error" };
      results.push(payload);
      res.write(JSON.stringify(payload) + "\n");
    }
  }

  res.end();
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
