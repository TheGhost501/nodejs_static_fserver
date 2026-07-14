# Project 1 — Static File Server from Scratch

**Stack:** raw Node.js only — zero npm packages.
**Curriculum coverage:** Module 1 (event loop, req/res wrappers, streams, pub/sub, events, fs, debugging).
**Size estimate:** ~100–150 lines · 2–3 sessions.

## Goal

Build an HTTP server that serves files from a `public/` folder, streams large files with flat memory usage, and logs every request through a shared event bus.

## Requirements

### 1. Server core
- Use `node:http` and `createServer`.
- Read the port from `process.env.PORT`, defaulting to `3000`.
- Map the request URL to a file path under `public/`:
  - `/videos/demo.mp4` → `public/videos/demo.mp4`
  - `/` → `public/index.html`

### 2. Streaming
- Never load a whole file with `readFile` — use `createReadStream` piped into `res` via `pipeline` from `node:stream/promises`.
- Set `Content-Type` from the file extension using a small hand-written map (`html`, `css`, `js`, `json`, `png`, `mp4` is enough).

### 3. Status codes
| Situation | Response |
|---|---|
| File served successfully | `200` |
| File doesn't exist | `404` + a small HTML error page |
| Stream fails mid-flight | `500` (or destroy the socket if headers already sent) |
| Any method other than GET | `405` |

### 4. Event bus (pub/sub)
- Create one shared `EventEmitter`.
- The request handler **publishes**: `request:served` and `request:failed`, each with `{ method, url, status, ms }`.
- Two independent **subscribers**:
  1. Console logger — prints one line per request.
  2. File logger — appends a line to `logs/access.log` using `node:fs/promises` (`flag: 'a'`). Create the `logs/` folder on boot with `mkdir(..., { recursive: true })`.
- Neither subscriber may know about the other; the handler must not call them directly.

### 5. Modern Node throughout
- `"type": "module"` in package.json — ESM only.
- All core imports use the `node:` prefix.
- `async`/`await` only; no callback-style fs.

## Stretch goals (pick at least one)

- **Traversal guard:** reject any path containing `..` with `403` — then actively try to break your own guard (`/..%2f..%2fetc/passwd` etc.).
- **Range requests:** support the `Range` header so video seeking works in the browser (`206 Partial Content`, `Content-Range` header).
- **Live debugging:** run with `node --inspect`, set a breakpoint inside the handler, and inspect `req.headers` in Chrome DevTools.

## Bonus objective 🏆

**Graceful concurrency proof.** Add a `/slow` route that awaits `setTimeout` (from `node:timers/promises`) for 5 seconds before responding. While `/slow` is pending in one tab, request `index.html` in another — it must respond instantly. Then write a *deliberately blocking* version (a `while` loop burning 5s of CPU) and watch the second tab hang. Write 3–4 sentences in your README explaining exactly why, in event-loop terms. This is the single most important mental model in Node — prove it to yourself.

## Definition of done

1. Drop a 100+ MB video into `public/`, open it in the browser, and confirm memory stays flat — log `process.memoryUsage().rss` every 5 seconds to watch it.
2. Kill the file mid-download (delete/rename it) and confirm the failure path fires **without crashing the process**.
3. `logs/access.log` contains one line per request, including the failures.
