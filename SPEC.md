# Build Spec — Static File Server (you write every line)

Companion to [project-1-static-file-server.md](project-1-static-file-server.md).
Rules of engagement: **you** implement each feature in order; consult the mentor when stuck
(you get two hints before a reveal). Each feature has acceptance criteria you can verify
yourself with a browser or `curl` before moving on.

The API reference you asked for is at the bottom — [§ Node API reference](#node-api-reference).

---

## Feature 1 — Server core (rewrite)

**Goal:** an HTTP server that maps any request URL to an absolute file path confined
under `public/`, and proves the mapping works.

You already made the design decisions for this one — this is retrieval practice:

- ESM has no `__dirname`. Rebuild it from `import.meta.url` (see [node:url](#nodeurl)).
- Resolve the absolute path of `public/` **once**, at startup.
- Write a `resolvePath(url)` function:
  1. Strip the query string (`?…` is not part of the file path).
  2. `decodeURIComponent` the rest (so `%2e%2e` becomes `..` *before* you check anything).
  3. `/` → `/index.html`.
  4. `path.join(PUBLIC_DIR, pathname)` — join, **not** resolve (remember why).
  5. If the result doesn't start with `PUBLIC_DIR`, return `null` — the confinement check.
- For now the handler can just `res.end()` the resolved path as plain text.

**Acceptance criteria:**
- [ ] `node server.js` prints the port and serves on `3000`.
- [ ] `PORT=4000` (PowerShell: `$env:PORT=4000; node server.js`) changes the port.
- [ ] `curl http://localhost:3000/style.css` echoes a path inside `public/`.
- [ ] `curl --path-as-is http://localhost:3000/..%2f..%2fpackage.json` does **not**
      resolve outside `public/` (`--path-as-is` stops curl from normalizing `..` for you).

---

## Feature 2 — Streaming + Content-Type

**Goal:** actually serve the file's bytes, with flat memory, and the right MIME type.

- Build a small extension → MIME map (values are in [§ MIME types](#mime-types)).
- `path.extname(filePath)` gives you the extension **with the dot** (`".css"`).
- Open the file with `createReadStream` (lives on `node:fs`, not `fs/promises`).
- Send it with `await pipeline(stream, res)` from `node:stream/promises`.
- Unknown extension → `application/octet-stream`.
- Set the header **before** the first byte flows: `res.writeHead(200, { "Content-Type": … })`.

**Open question you still owe an answer to:** why does the spec ban `readFile`?
Where are a 2 GB file's bytes at the moment before the first byte reaches the client,
in each approach? Answer when you report this feature done.

**Acceptance criteria:**
- [ ] `http://localhost:3000/` renders the styled index page (CSS applied, JS runs —
      that proves three MIME types at once).
- [ ] `curl -I http://localhost:3000/style.css` shows `Content-Type: text/css`.
- [ ] A request for a missing file may still crash ugly — that's Feature 3's job.

---

## Feature 3 — Status codes

**Goal:** every failure mode gets a deliberate response, and none of them kill the process.

| Situation | Response |
|---|---|
| Served OK | `200` |
| File doesn't exist | `404` + serve `public/404.html` (already made for you) |
| `resolvePath` returned `null` | `403`, plain text is fine (formalized in Feature 5) |
| Stream fails **after** headers sent | destroy the socket (see gotcha) |
| Method ≠ GET | `405` + `Allow: GET` header |

- Wrap the pipeline in `try/catch`. In the catch, the error's `code` property tells you
  what happened: `ENOENT` = no such file, `EISDIR` = it's a directory.
- **The gotcha this feature exists for:** once the first chunk is written, the status
  line is already on the wire — you cannot change `200` into `500` anymore. Check
  `res.headersSent` in the catch: if `false`, send a proper error response; if `true`,
  `res.destroy()` — killing the connection mid-body is how the browser learns the
  download is broken.

**Acceptance criteria:**
- [ ] `curl -i http://localhost:3000/nope.html` → `404` and the styled error page.
- [ ] `curl -i -X POST http://localhost:3000/` → `405`.
- [ ] Requesting a folder (e.g. `/videos`) doesn't crash the process.
- [ ] After any of the above, the server still answers the next request.

---

## Feature 4 — Event bus (pub/sub)

**Goal:** the handler announces outcomes; independent subscribers react. Nobody knows
about anybody.

- Make a `bus.js` module that exports one shared `EventEmitter` instance
  (module exports are cached — every importer gets the *same* object).
- In the handler, record a start time (`performance.now()`), and after the response
  finishes (or fails) emit **one** of:
  - `request:served`, payload `{ method, url, status, ms }`
  - `request:failed`, same payload shape
- Subscriber 1 (`loggers/console.js` or similar): `bus.on(…)` → one printed line per request.
- Subscriber 2 (file logger): appends one line to `logs/access.log` via
  `appendFile` from `node:fs/promises`. Create `logs/` on boot:
  `await mkdir("logs", { recursive: true })` — `recursive: true` also means
  "don't throw if it already exists".
- The handler must **never** call a logger function directly — it only `emit`s.
  Test the decoupling: comment out one subscriber import; the other must keep working.

**Acceptance criteria:**
- [ ] Every request prints one console line AND appends one file line.
- [ ] Failures (404s) are logged too, with their status.
- [ ] Removing either subscriber leaves the other fully functional.

---

## Feature 5 — Stretch: traversal guard, then attack it

**Goal:** formalize the confinement check into a `403`, then genuinely try to break it.

- `resolvePath` returning `null` → respond `403`.
- `decodeURIComponent` **throws** `URIError` on malformed input like `/%zz` — if you
  haven't wrapped it, that's a crash. Catch it → `400 Bad Request`.
- Attack yourself (`--path-as-is` keeps curl honest):
  ```
  curl --path-as-is -i "http://localhost:3000/../package.json"
  curl --path-as-is -i "http://localhost:3000/..%2f..%2fpackage.json"
  curl --path-as-is -i "http://localhost:3000/%2e%2e/%2e%2e/package.json"
  curl --path-as-is -i "http://localhost:3000/....//package.json"
  curl --path-as-is -i "http://localhost:3000/%zz"
  ```

**Acceptance criteria:**
- [ ] All five return `4xx`, none return file contents from outside `public/`, none crash.

---

## Feature 6 — Bonus: the event-loop proof

**Goal:** prove to yourself why Node handles concurrency the way it does.

- Route `/slow`: `await setTimeout(5000)` from `node:timers/promises`, then respond.
- While `/slow` loads in one tab, `index.html` in a second tab must be instant.
- Route `/block`: a `while (Date.now() - start < 5000) {}` loop, then respond.
- While `/block` "loads", the second tab **hangs**. 
- Write 3–4 sentences in a `README.md`: why does awaiting a timer keep the server
  responsive while a while-loop freezes it? Use the words *event loop*, *single thread*,
  and *yield*. I will review the paragraph like code.

**Acceptance criteria:**
- [ ] Both routes exist; the two-tab experiment behaves as described.
- [ ] README paragraph written in your own words.

---

## Feature 7 — Definition of done

1. Drop a 100+ MB video into `public/videos/`, play it in the browser. Log memory every
   5 s: `setInterval(() => console.log(process.memoryUsage().rss / 1e6, "MB"), 5000)`.
   RSS must stay flat-ish (not grow by the size of the video).
2. Rename the video mid-download → failure path fires, process survives,
   `request:failed` is logged.
3. `logs/access.log` has one line per request including failures.

---
---

# Node API reference

Everything below is stdlib — `import … from "node:…"`. The `node:` prefix is required
by your spec and good practice: it can't be shadowed by an npm package with the same name.

## node:http

```js
import http from "node:http";
const server = http.createServer((req, res) => { … });
server.listen(port, callback);
```

- The callback runs **once per request**. `req` is an `IncomingMessage` (a *readable*
  stream), `res` is a `ServerResponse` (a *writable* stream) — that's exactly why a file
  stream can be piped into `res`.
- `req.method` — `"GET"`, `"POST"`, … (always uppercase).
- `req.url` — path + query, e.g. `/videos/demo.mp4?t=30`. **Not** a full URL; no host.
  Attacker-controlled text — never trust it.
- `req.headers` — plain object, header names lowercased.
- `res.writeHead(status, headersObject)` — status line + headers in one call. Must
  happen before any body bytes.
- `res.setHeader(name, value)` — same, one at a time, before `writeHead`/first write.
- `res.end([data])` — finish the response (optionally writing a last chunk).
- `res.headersSent` — `true` once the status line is on the wire. **The** flag for
  deciding "can I still send a clean error page, or is it too late?"
- `res.destroy()` — slam the connection shut. The correct move when a stream dies
  mid-body.

## node:path

Pure string manipulation — nothing here touches the disk.

- `path.join(a, b, …)` — glue segments with the right separator, normalize `.`/`..`.
  Stays anchored to the first segment: `join("public", "/etc/passwd")` →
  `public\etc\passwd`.
- `path.resolve(a, b, …)` — build an **absolute** path, processing **right to left,
  stopping at the first absolute segment and discarding everything left of it**:
  `resolve("public", "/etc/passwd")` → `C:\etc\passwd`. ⚠️ The base evaporates —
  never call it with untrusted input as a later argument.
- `path.extname(p)` — extension **including the dot**: `"demo.mp4"` → `".mp4"`;
  no extension → `""`.
- `path.dirname(p)` / `path.basename(p)` — folder part / file part.
- `path.sep` — `"\\"` on Windows, `"/"` elsewhere. Why your resolved paths show
  backslashes even though URLs use forward slashes (join normalizes for you).
- `path.normalize(p)` — collapses `..`/`.`/doubled separators without joining anything.

## node:url

- The ESM `__dirname` reconstruction (memorize this pair):
  ```js
  import { fileURLToPath } from "node:url";
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  ```
  `import.meta.url` is this file's location as a `file://` URL; `fileURLToPath`
  converts it to a normal filesystem path.
- `new URL(req.url, "http://localhost")` — the clean way to split path from query:
  `.pathname` (already percent-decoded? **no** — still encoded; decode yourself),
  `.searchParams.get("t")` for query values. The second argument (base) is required
  because `req.url` is relative.

## node:fs and node:fs/promises

Two flavors of the same module — know which you're importing:

- `node:fs/promises` — `await`-able versions: `mkdir`, `appendFile`, `stat`, `readdir`, `rm`…
  - `mkdir(dir, { recursive: true })` — creates parents, silent if it already exists.
  - `appendFile(file, line)` — open-append-close in one call (the `{ flag: "a" }` your
    spec mentions is what `appendFile` does implicitly).
- `node:fs` (plain) — where the stream factories live:
  - `createReadStream(path)` — returns a readable stream immediately; errors
    (missing file etc.) arrive *asynchronously* as stream errors — which `pipeline`
    converts into a rejected promise for you.
- Gotcha worth knowing: prefer "just open it and handle the error" over
  "check existence with `stat`, then open" — between the check and the open the file
  can vanish (a race called TOCTOU). Your mid-download-delete test exercises exactly this.

## node:stream/promises

```js
import { pipeline } from "node:stream/promises";
await pipeline(readStream, res);
```

- Pumps chunks source → destination with **backpressure**: reads only as fast as the
  client consumes, which is why memory stays flat on a 2 GB file.
- Why not `stream.pipe(res)`? `.pipe()` swallows errors and can leak file handles when
  the client disconnects. `pipeline` destroys both ends and gives you one rejected
  promise to `catch`. It's the modern default.

## node:events

```js
import { EventEmitter } from "node:events";
export const bus = new EventEmitter();
```

- `bus.on(name, fn)` — subscribe (every occurrence). `bus.once(name, fn)` — first only.
- `bus.emit(name, payload)` — publish, synchronously calls all subscribers in order.
  Returns `false` if nobody was listening (emitting into the void is not an error).
- ⚠️ The event name `"error"` is special: emitting it with **zero** listeners throws
  and can crash the process. Name your events anything else (you did: `request:failed`).

## node:timers/promises

```js
import { setTimeout } from "node:timers/promises";
await setTimeout(5000);            // resolves after 5 s — yields the event loop
```

Not to be confused with the global callback `setTimeout(fn, ms)` — same name,
promise-based, made for `await`.

## process (global, no import)

- `process.env.PORT` — environment variable, always a **string** or `undefined`.
- `process.memoryUsage().rss` — resident set size in bytes; your flat-memory proof.

## MIME types

| ext | Content-Type |
|---|---|
| `.html` | `text/html; charset=utf-8` |
| `.css` | `text/css; charset=utf-8` |
| `.js` | `text/javascript; charset=utf-8` |
| `.json` | `application/json` |
| `.png` | `image/png` |
| `.mp4` | `video/mp4` |
| anything else | `application/octet-stream` |
