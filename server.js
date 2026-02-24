const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API endpoint: generate image via chat completions (Gemini image model)
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
    const imageMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);

    if (imageMatch) {
      // Return in OpenAI images format for frontend compatibility
      res.json({
        created: data.created,
        data: [{ url: imageMatch[1] }],
        model: data.model,
        raw_content: content,
      });
    } else {
      // No image found, return the text content
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
