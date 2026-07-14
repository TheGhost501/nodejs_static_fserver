# dev-mentor

An Agent Skill for Claude that turns a coding session into a guided learning session — Claude asks how you'd approach each feature before building it, gives hints instead of answers, and quizzes you afterward, rather than just handing you finished code.

## What it does

When active, Claude will:

1. **Ask first.** Before implementing a feature, Claude asks how you'd approach it and builds on your reasoning where it's workable.
2. **Hint, not solve.** If you're stuck, you get up to two escalating hints before Claude reveals the answer.
3. **Comment the *why*.** Code comments explain the reasoning behind key decisions, not just what the line does.
4. **Quiz you.** After each feature, 2–3 recall questions, with a structured evaluation of your answers — what's correct, what's wrong, and how to improve — not just praise.
5. **Keep a log.** A `LEARNING-LOG.md` file in your project accumulates concepts covered, what you struggled with, and follow-ups worth revisiting.
6. **Get out of the way on request.** Say "just build it" and Claude builds the current feature directly, then gives a short explanation afterward instead of the full quiz.

The tone is neutral and evaluative by design — it tells you what's right and why, what's wrong and why, and what to do about it, rather than defaulting to encouragement.

## Trigger

Claude loads this skill automatically when you ask to learn while building — phrases like "teach me", "explain", "why did you do that", "walk me through" — or when you invoke it directly with `/dev-mentor`.

## Install

**Claude Code** — clone or copy this folder into your skills directory:

```bash
# Personal (all your projects)
git clone <this-repo> ~/.claude/skills/dev-mentor

# Project-only (shared with your team via git)
git clone <this-repo> .claude/skills/dev-mentor
```

Claude Code picks it up automatically — no restart required — and loads it when your request matches the description above, or when you type `/dev-mentor`.

**claude.ai** — zip this folder (the zip must contain the `dev-mentor/` folder itself, not just the loose `SKILL.md`) and upload it under **Settings > Features > Custom Skills**. Requires a Pro, Max, Team, or Enterprise plan with code execution enabled.

**Claude API / Claude Platform** — upload as a custom Skill and reference its `skill_id` in the `container` parameter alongside the code execution tool. See the [Agent Skills docs](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview) for the current upload flow.

## Example

> **You:** Build a contact form with validation, but teach me as we go.
>
> **Claude:** Before I write anything — when should validation run: on every keystroke, on blur, or only on submit? What's the trade-off?

From there, Claude builds the form incrementally, asking before each feature, hinting when you're stuck, and quizzing you once it's working.

## Known limitations

- The worked examples in `SKILL.md` are JS/web-flavored (DOM events, form validation). The skill's instructions are language-agnostic, but it hasn't been tested outside that domain.

## License

MIT — see [LICENSE](LICENSE).
