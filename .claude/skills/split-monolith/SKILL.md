---
name: split-monolith
description: Audit a codebase for oversized or unstructured files (inline CSS/JS in views, monolithic controllers/components, huge single files) and refactor them into properly separated, framework-idiomatic modules. Use when the user asks to "clean up"/"restructure"/"break up" large files, mentions files that have grown unwieldy, or asks you to organize code "like a senior developer would."
---

# Split Monolith

## Instructions

### Step 1: Audit
Search the codebase for signs of monolithic structure:
- Inline `<style>`/`<script>` blocks inside view/template files.
- Files well above the norm for the language/framework (e.g. a 1000+ line Blade view, a controller with a dozen unrelated responsibilities, a single JS file mixing multiple features).
- Duplicated markup or logic that suggests missing partials/components.

Use Grep/Glob to find candidates by size and by inline `<style>`/`<script>` tags rather than reading every file blind.

### Step 2: Write a short plan before editing
For each file/area, state:
- What it currently mixes together.
- The target structure (e.g. extract inline CSS → `resources/css/<name>.css` bundled via Vite; extract inline JS → an ES module; split a huge Blade view into `@include`/`<x-component>` partials by section).
Share this plan with the user before making sweeping changes if the scope is large (many files) — proceed directly only for a small, obviously-scoped ask.

### Step 3: Execute the split
- Extract CSS/JS to dedicated files, wire them into the build pipeline (Vite entrypoints, `@vite` directives, imports) — don't leave them orphaned/unbundled.
- Split oversized views/components along natural section boundaries (header/nav, hero, body sections, footer) into partials or components with clear names.
- Keep behavior identical — this is a structural refactor, not a rewrite. Don't change logic while moving it unless a bug is discovered in passing (flag it, don't silently fix scope-creep).

### Step 4: Verify
- Run the app (or relevant build step) and confirm it still renders/functions the same before and after.
- If a `/verify` or `/run` skill is available for this project, use it to confirm no regressions rather than eyeballing alone.
