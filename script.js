"use strict";

// Thumbnail variants YouTube exposes for every video, largest first.
const THUMBNAIL_SIZES = [
  { key: "maxresdefault", label: "Max Resolution", width: 1280, height: 720 },
  { key: "sddefault", label: "Standard Definition", width: 640, height: 480 },
  { key: "hqdefault", label: "High Quality", width: 480, height: 360 },
  { key: "mqdefault", label: "Medium Quality", width: 320, height: 180 },
  { key: "default", label: "Default", width: 120, height: 90 },
];

const form = document.getElementById("search-form");
const input = document.getElementById("url-input");
const message = document.getElementById("message");
const results = document.getElementById("results");

/**
 * Extracts the 11-character video id from any common YouTube URL form.
 * Returns null when no valid id is found.
 */
function extractVideoId(rawUrl) {
  const value = rawUrl.trim();
  if (!value) return null;

  // Bare id pasted directly.
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return isValidId(id) ? id : null;
  }

  if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    const vParam = url.searchParams.get("v");
    if (isValidId(vParam)) return vParam;

    // /embed/ID, /shorts/ID, /live/ID, /v/ID
    const match = url.pathname.match(
      /\/(?:embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})/
    );
    if (match) return match[1];
  }

  return null;
}

function isValidId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{11}$/.test(id);
}

function thumbnailUrl(videoId, sizeKey) {
  return `https://i.ytimg.com/vi/${videoId}/${sizeKey}.jpg`;
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

/**
 * Loads an image and resolves with its natural dimensions, or rejects.
 * YouTube returns a 120x90 placeholder for missing sizes (e.g. maxres on
 * some videos); we treat that fallback as "unavailable".
 */
function probeThumbnail(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth <= 120 && img.naturalHeight <= 90) {
        reject(new Error("placeholder"));
      } else {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    img.onerror = () => reject(new Error("load-failed"));
    img.src = url;
  });
}

/**
 * Forces a file download. Tries fetching the cross-origin image as a blob
 * (works because i.ytimg.com sends permissive CORS headers). Falls back to
 * opening the image in a new tab if the fetch is blocked.
 */
async function downloadImage(url, filename, button) {
  const original = button.textContent;
  button.setAttribute("aria-disabled", "true");
  button.textContent = "Downloading…";

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    // Fallback: let the browser handle it in a new tab.
    window.open(url, "_blank", "noopener");
  } finally {
    button.removeAttribute("aria-disabled");
    button.textContent = original;
  }
}

function createCard(videoId, size, dims) {
  const url = thumbnailUrl(videoId, size.key);
  const filename = `${videoId}-${size.key}.jpg`;

  const card = document.createElement("article");
  card.className = "card";

  const preview = document.createElement("div");
  preview.className = "card-preview";
  const img = document.createElement("img");
  img.src = url;
  img.alt = `${size.label} thumbnail preview`;
  img.loading = "lazy";
  preview.appendChild(img);

  const body = document.createElement("div");
  body.className = "card-body";

  const info = document.createElement("div");
  info.className = "card-info";
  const label = document.createElement("span");
  label.className = "card-label";
  label.textContent = size.label;
  const dimsEl = document.createElement("span");
  dimsEl.className = "card-dims";
  dimsEl.textContent = `${dims.width} × ${dims.height}`;
  info.append(label, dimsEl);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "download-button";
  button.textContent = "⬇ Download";
  button.addEventListener("click", () => downloadImage(url, filename, button));

  body.append(info, button);
  card.append(preview, body);
  return card;
}

async function render(videoId) {
  results.innerHTML = "";
  setMessage("Checking available thumbnail sizes…");

  const probes = await Promise.allSettled(
    THUMBNAIL_SIZES.map((size) =>
      probeThumbnail(thumbnailUrl(videoId, size.key)).then((dims) => ({
        size,
        dims,
      }))
    )
  );

  const available = probes.filter((p) => p.status === "fulfilled");

  if (available.length === 0) {
    setMessage("No thumbnails found for that video. Check the URL.", true);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const { value } of available) {
    fragment.appendChild(createCard(videoId, value.size, value.dims));
  }
  results.appendChild(fragment);
  setMessage(`Found ${available.length} thumbnail size(s). Click to download.`);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const videoId = extractVideoId(input.value);

  if (!videoId) {
    results.innerHTML = "";
    setMessage("That doesn't look like a valid YouTube link.", true);
    return;
  }

  render(videoId);
});
