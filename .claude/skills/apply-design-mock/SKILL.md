---
name: apply-design-mock
description: Given a Figma frame link, an image, or an HTML mockup, extract its assets, copy, and layout, then apply them to specified page(s) in the codebase, verifying the result visually in a browser. Use when the user shares a Figma URL, design image, or HTML mock and asks to "apply this", "make the page match this", or "update the header/footer/navbar from this design".
---

# Apply Design Mock

## Instructions

### Step 1: Confirm scope before starting
Check whether the design source has changed since a prior attempt (this is a task the user has re-sent before, sometimes after context was lost rather than genuinely wanting a repeat). If a very similar request appears recently in conversation, briefly confirm what's different this time rather than blindly redoing identical work.

Clarify which target page(s)/component(s) the mock applies to if not explicit (e.g. "just the navbar and footer" vs "the whole page").

### Step 2: Extract from the source
- **Figma link**: use available Figma/design tooling (e.g. Figma MCP tools if connected) to pull layout, spacing, colors, typography, and exported assets. If no Figma tool is available, ask the user to export/share the relevant assets and specs directly.
- **Image**: read it directly to identify layout regions, colors, copy, and imagery.
- **HTML mock**: read the file directly — it's already structured, so map its sections to the target templates rather than re-deriving from a screenshot.

Extract literal text/copy, not paraphrases — copy should match the mock exactly unless the user says otherwise.

### Step 3: Apply to target page(s)
- Match the codebase's existing conventions (component structure, CSS approach, asset pipeline) rather than pasting raw mock markup wholesale.
- Bring in real asset files (images, icons) into the project's asset directory rather than linking external URLs.
- Apply layout, colors, typography, and copy section by section (nav, hero, body, footer) so partial review is possible.

### Step 4: Verify visually
- Run the app locally (use the project's `/run` skill if one exists).
- Take a browser screenshot of the updated page(s) and compare against the source mock side-by-side.
- Check both the golden path (page loads correctly) and responsive/edge behavior if the mock implies it (e.g. mobile nav).
- Report any deviations from the mock (e.g. a font substitution, missing asset) rather than silently approximating.
