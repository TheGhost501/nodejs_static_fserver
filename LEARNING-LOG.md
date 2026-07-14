# Learning Log

## 2026-07-14 — Setup + server core design

**Concepts covered:** path traversal via `../`, `path.join` vs `path.resolve`
(absolute-segment trap), confinement check with `startsWith(PUBLIC_DIR)`,
ESM `__dirname` via `fileURLToPath(import.meta.url)`, curl normalizing `..`
client-side (why real attacks URL-encode as `%2e%2e`).

**Struggled with / worth revisiting:** identified the `../` traversal risk after one
hint; `join` vs `resolve` — guessed both halves partially but missed that *both*
normalize `..` and that `resolve` discards the base when a later segment is absolute.

**Follow-ups:** run `path.join("public", "/etc/passwd")` vs
`path.resolve("public", "/etc/passwd")` in a Node REPL and watch the difference.

**Session note:** first server.js was mentor-written under the old skill rules, then
deleted; user rewrites everything from SPEC.md onward. Skill amended: spec-and-review,
not implement.

**Open question (unanswered):** why streams over `readFile` — where are a 2 GB file's
bytes in each approach? Due with Feature 2.
