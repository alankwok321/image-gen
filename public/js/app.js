// ===== DOM References =====
const promptEl = document.getElementById("prompt");
const sizeEl = document.getElementById("size");
const modelEl = document.getElementById("model");
const generateBtn = document.getElementById("generate-btn");
const btnText = generateBtn.querySelector(".btn-text");
const btnLoading = generateBtn.querySelector(".btn-loading");
const resultSection = document.getElementById("result");
const resultImage = document.getElementById("result-image");
const resultPrompt = document.getElementById("result-prompt");
const downloadBtn = document.getElementById("download-btn");
const errorEl = document.getElementById("error");
const historySection = document.getElementById("history-section");
const historyGrid = document.getElementById("history");

// ===== State =====
const history = [];

// ===== Helpers =====
function setLoading(loading) {
  generateBtn.disabled = loading;
  btnText.hidden = loading;
  btnLoading.hidden = !loading;
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

function hideError() {
  errorEl.hidden = true;
}

// ===== Generate =====
async function generate() {
  const prompt = promptEl.value.trim();
  if (!prompt) {
    showError("Please enter a prompt.");
    return;
  }

  hideError();
  resultSection.hidden = true;
  setLoading(true);

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        size: sizeEl.value,
        model: modelEl.value,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const msg = data.error?.message || "Unknown error occurred.";
      showError(msg);
      return;
    }

    // Extract image URL or base64
    const imgData = data.data && data.data[0];
    if (!imgData) {
      showError("No image data returned from API.");
      return;
    }

    const imgSrc = imgData.url || (imgData.b64_json ? "data:image/png;base64," + imgData.b64_json : null);
    if (!imgSrc) {
      showError("Unexpected response format.");
      return;
    }

    // Show result
    resultImage.src = imgSrc;
    resultPrompt.textContent = prompt;
    downloadBtn.href = imgSrc;
    resultSection.hidden = false;

    // Add to history
    history.unshift({ prompt, src: imgSrc });
    renderHistory();
  } catch (err) {
    console.error(err);
    showError("Failed to connect to the server.");
  } finally {
    setLoading(false);
  }
}

// ===== History =====
function renderHistory() {
  if (history.length === 0) {
    historySection.hidden = true;
    return;
  }

  historySection.hidden = false;
  historyGrid.innerHTML = "";

  history.forEach((item) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <img src="${item.src}" alt="${item.prompt}" loading="lazy" />
      <div class="history-label">${item.prompt}</div>
    `;
    // Click to view full size
    div.addEventListener("click", () => {
      resultImage.src = item.src;
      resultPrompt.textContent = item.prompt;
      downloadBtn.href = item.src;
      resultSection.hidden = false;
      window.scrollTo({ top: resultSection.offsetTop - 20, behavior: "smooth" });
    });
    historyGrid.appendChild(div);
  });
}

// ===== Event Listeners =====
generateBtn.addEventListener("click", generate);

// Generate on Ctrl+Enter / Cmd+Enter
promptEl.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    generate();
  }
});
