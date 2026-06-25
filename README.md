# yt-thumbnail-downloader

A simple, responsive YouTube thumbnail downloader built with vanilla HTML, CSS, and JavaScript. No build step, no dependencies.

## Features

- Paste any YouTube URL (`watch`, `youtu.be`, `shorts`, `embed`, `live`, or a bare video id)
- Detects which thumbnail sizes the video actually has
- Live image preview for each available size
- One-click download (fetches the image as a blob to force a real download)
- Fully responsive layout

## Usage

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

Paste a YouTube link, click **Get Thumbnails**, then click **Download** on the size you want.

## Files

- `index.html` — markup
- `styles.css` — styling and responsive layout
- `script.js` — URL parsing, size detection, and download logic
