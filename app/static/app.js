// Front-end logic: collect the image + options, submit, poll, show the clip.
(() => {
  "use strict";

  const POLL_INTERVAL_MS = 4000;
  const MAX_POLL_MS = 6 * 60 * 1000; // give up after 6 minutes

  const $ = (id) => document.getElementById(id);

  const dropZone = $("dropZone");
  const imageInput = $("imageInput");
  const dropPrompt = $("dropPrompt");
  const preview = $("preview");
  const promptEl = $("prompt");
  const duration = $("duration");
  const durationLabel = $("durationLabel");
  const resolution = $("resolution");
  const aspectRatio = $("aspectRatio");
  const form = $("genForm");
  const submitBtn = $("submitBtn");

  const result = $("result");
  const progress = $("progress");
  const progressText = $("progressText");
  const errorBox = $("errorBox");
  const videoWrap = $("videoWrap");
  const video = $("video");
  const downloadLink = $("downloadLink");
  const resetBtn = $("resetBtn");

  let selectedFile = null;
  let pollTimer = null;

  // --- mock-mode banner ---------------------------------------------------
  fetch("/api/health")
    .then((r) => r.json())
    .then((d) => { if (d.mock_mode) $("mockBanner").hidden = false; })
    .catch(() => {});

  // --- file selection -----------------------------------------------------
  function setFile(file) {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      showError("Please choose a PNG, JPEG or WebP image.");
      return;
    }
    selectedFile = file;
    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.hidden = false;
    dropPrompt.hidden = true;
    updateSubmitState();
  }

  imageInput.addEventListener("change", (e) => setFile(e.target.files[0]));

  ["dragenter", "dragover"].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
    })
  );
  dropZone.addEventListener("drop", (e) => {
    if (e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]);
  });

  // --- options ------------------------------------------------------------
  duration.addEventListener("input", () => {
    durationLabel.textContent = `${duration.value}s`;
  });
  promptEl.addEventListener("input", updateSubmitState);

  function updateSubmitState() {
    submitBtn.disabled = !(selectedFile && promptEl.value.trim());
  }

  // --- submit -------------------------------------------------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setBusy(true);
    showProgress("Submitting to Grok Imagine…");

    const fd = new FormData();
    fd.append("image", selectedFile);
    fd.append("prompt", promptEl.value.trim());
    fd.append("duration", duration.value);
    fd.append("resolution", resolution.value);
    fd.append("aspect_ratio", aspectRatio.value);

    try {
      const resp = await fetch("/api/generate", { method: "POST", body: fd });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Request failed.");
      pollStatus(data.request_id, Date.now());
    } catch (err) {
      showError(err.message);
      setBusy(false);
    }
  });

  // --- polling ------------------------------------------------------------
  function pollStatus(requestId, startedAt) {
    showProgress("Generating your video… this can take a minute.");

    const tick = async () => {
      if (Date.now() - startedAt > MAX_POLL_MS) {
        showError("Timed out waiting for the video. Please try again.");
        setBusy(false);
        return;
      }
      try {
        const resp = await fetch(`/api/status/${encodeURIComponent(requestId)}`);
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || "Status check failed.");

        if (data.status === "done" && data.video_url) {
          showVideo(requestId, data.video_url);
          setBusy(false);
          return;
        }
        if (data.status === "failed" || data.status === "expired") {
          throw new Error(data.error || `Generation ${data.status}.`);
        }
        pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
      } catch (err) {
        showError(err.message);
        setBusy(false);
      }
    };
    tick();
  }

  // --- UI state helpers ---------------------------------------------------
  function showProgress(text) {
    result.hidden = false;
    errorBox.hidden = true;
    videoWrap.hidden = true;
    progress.hidden = false;
    progressText.textContent = text;
  }

  function showError(message) {
    result.hidden = false;
    progress.hidden = true;
    videoWrap.hidden = true;
    errorBox.hidden = false;
    errorBox.textContent = `⚠️ ${message}`;
  }

  function showVideo(requestId, url) {
    result.hidden = false;
    progress.hidden = true;
    errorBox.hidden = true;
    videoWrap.hidden = false;
    video.src = url;
    downloadLink.href = `/api/download/${encodeURIComponent(requestId)}`;
  }

  function setBusy(busy) {
    submitBtn.disabled = busy || !(selectedFile && promptEl.value.trim());
    submitBtn.textContent = busy ? "Generating…" : "Generate video";
    if (!busy && pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  }

  // --- reset --------------------------------------------------------------
  resetBtn.addEventListener("click", () => {
    if (pollTimer) clearTimeout(pollTimer);
    result.hidden = true;
    video.pause();
    video.removeAttribute("src");
    video.load();
  });
})();
