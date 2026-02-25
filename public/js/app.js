// ===== DOM References — Single Image =====
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

// ===== DOM References — Scene Generator =====
const scenePromptEl = document.getElementById("scene-prompt");
const sceneCountEl = document.getElementById("scene-count");
const sceneModelEl = document.getElementById("scene-model");
const sceneGenerateBtn = document.getElementById("scene-generate-btn");
const sceneBtnText = sceneGenerateBtn.querySelector(".btn-text");
const sceneBtnLoading = sceneGenerateBtn.querySelector(".btn-loading");
const sceneProgressSection = document.getElementById("scene-progress");
const sceneProgressText = document.getElementById("scene-progress-text");
const sceneProgressCount = document.getElementById("scene-progress-count");
const sceneProgressBar = document.getElementById("scene-progress-bar");
const sceneResultsSection = document.getElementById("scene-results");
const sceneResultsTitle = document.getElementById("scene-results-title");
const sceneGrid = document.getElementById("scene-grid");
const sceneDownloadZip = document.getElementById("scene-download-zip");
const sceneErrorEl = document.getElementById("scene-error");

// ===== Tab Navigation =====
const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});

// ===== State =====
const history = [];
let sceneImages = []; // [{url, index}]

// ===== Helpers =====
function setLoading(loading) {
  generateBtn.disabled = loading;
  btnText.hidden = loading;
  btnLoading.hidden = !loading;
}

function setSceneLoading(loading) {
  sceneGenerateBtn.disabled = loading;
  sceneBtnText.hidden = loading;
  sceneBtnLoading.hidden = !loading;
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

function hideError() {
  errorEl.hidden = true;
}

function showSceneError(msg) {
  sceneErrorEl.textContent = msg;
  sceneErrorEl.hidden = false;
}

function hideSceneError() {
  sceneErrorEl.hidden = true;
}

// ===== Generate Single Image =====
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

    resultImage.src = imgSrc;
    resultPrompt.textContent = prompt;
    downloadBtn.href = imgSrc;
    resultSection.hidden = false;

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

// ===== Generate Scenes =====
async function generateScenes() {
  const prompt = scenePromptEl.value.trim();
  if (!prompt) {
    showSceneError("Please enter a story or concept prompt.");
    return;
  }

  const sceneCount = parseInt(sceneCountEl.value);
  const model = sceneModelEl.value;

  hideSceneError();
  setSceneLoading(true);
  sceneImages = [];
  sceneGrid.innerHTML = "";
  sceneResultsSection.hidden = true;

  // Show progress
  sceneProgressSection.hidden = false;
  sceneProgressText.textContent = "Generating scene 1…";
  sceneProgressCount.textContent = `0 / ${sceneCount}`;
  sceneProgressBar.style.width = "0%";

  // Create placeholder cards
  for (let i = 0; i < sceneCount; i++) {
    const card = document.createElement("div");
    card.className = "scene-card pending";
    card.id = `scene-card-${i}`;
    card.innerHTML = `
      <div class="scene-placeholder">
        <span class="spinner"></span>
        <span>Scene ${i + 1}</span>
      </div>
      <div class="scene-label">Scene ${i + 1} of ${sceneCount}</div>
    `;
    sceneGrid.appendChild(card);
  }

  sceneResultsSection.hidden = false;

  try {
    const res = await fetch("/api/generate-scenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, sceneCount, model }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showSceneError(data.error?.message || "Failed to generate scenes.");
      setSceneLoading(false);
      sceneProgressSection.hidden = true;
      return;
    }

    // Read NDJSON stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let completed = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          completed++;

          const card = document.getElementById(`scene-card-${data.index}`);
          if (!card) continue;

          if (data.status === "ok" && data.url) {
            card.className = "scene-card";
            card.innerHTML = `
              <img src="${data.url}" alt="Scene ${data.index + 1}" loading="lazy" />
              <div class="scene-label">Scene ${data.index + 1} of ${data.total}</div>
            `;
            sceneImages.push({ url: data.url, index: data.index });
          } else {
            card.className = "scene-card error";
            card.innerHTML = `
              <div class="scene-placeholder scene-error-placeholder">
                <span>⚠️</span>
                <span>Failed</span>
              </div>
              <div class="scene-label">Scene ${data.index + 1} — Error</div>
            `;
          }

          // Update progress
          const pct = Math.round((completed / sceneCount) * 100);
          sceneProgressBar.style.width = pct + "%";
          sceneProgressCount.textContent = `${completed} / ${sceneCount}`;
          if (completed < sceneCount) {
            sceneProgressText.textContent = `Generating scene ${completed + 1}…`;
          } else {
            sceneProgressText.textContent = "All scenes complete!";
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    // Sort images by index
    sceneImages.sort((a, b) => a.index - b.index);
    sceneResultsTitle.textContent = `Generated ${sceneImages.length} Scene${sceneImages.length !== 1 ? "s" : ""}`;

    if (sceneImages.length === 0) {
      sceneDownloadZip.hidden = true;
    } else {
      sceneDownloadZip.hidden = false;
    }
  } catch (err) {
    console.error(err);
    showSceneError("Failed to connect to the server.");
  } finally {
    setSceneLoading(false);
    // hide progress bar after a short delay
    setTimeout(() => {
      sceneProgressSection.hidden = true;
    }, 1500);
  }
}

// ===== Download ZIP =====
async function downloadZip() {
  if (sceneImages.length === 0) return;

  sceneDownloadZip.disabled = true;
  sceneDownloadZip.textContent = "📦 Packing…";

  try {
    const zip = new JSZip();

    // Fetch all images as blobs
    const fetches = sceneImages.map(async (img) => {
      const resp = await fetch(img.url);
      const blob = await resp.blob();
      const num = String(img.index + 1).padStart(2, "0");
      zip.file(`scene-${num}.png`, blob);
    });

    await Promise.all(fetches);

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scenes.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("ZIP error:", err);
    showSceneError("Failed to create ZIP file.");
  } finally {
    sceneDownloadZip.disabled = false;
    sceneDownloadZip.textContent = "📦 Download ZIP";
  }
}

// ===== Event Listeners =====
generateBtn.addEventListener("click", generate);
sceneGenerateBtn.addEventListener("click", generateScenes);
sceneDownloadZip.addEventListener("click", downloadZip);

promptEl.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    generate();
  }
});

scenePromptEl.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    generateScenes();
  }
});
