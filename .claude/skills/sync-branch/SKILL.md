---
name: sync-branch
description: Fetch/pull the latest code from a named git branch (and restart dev servers), or push local work to a named branch resolving conflicts safely. Use when the user says things like "fetch/pull latest from branch X", "sync with branch X", "push to branch X", or names a repo URL + branch to sync with.
---

# Sync Branch

## Instructions

### Step 1: Identify direction and target
Determine from the user's request:
- Direction: pulling latest FROM the branch, or pushing local work TO it.
- Repo (if not the current one) and branch name — ask if ambiguous, don't guess.

### Step 2: Pre-flight safety check
Run `git status` before touching anything.
- If pulling: if there are uncommitted local changes that would conflict, stash them (`git stash -u`) or ask the user how to handle them — never discard silently.
- If pushing: confirm what's about to be pushed (`git log <branch>..HEAD --oneline` and `git diff <branch>`) before pushing.

### Step 3a: Pull path
1. `git fetch origin <branch>`
2. `git pull origin <branch>` (or rebase if that's this repo's convention — check recent merge commits to infer).
3. If conflicts occur, resolve them carefully by understanding both sides of the change — never blindly take "ours" or "theirs" without checking what's lost.
4. If a dev server is running for this project, restart it (check for `npm run dev`, `vite`, `php artisan serve`, etc. in package.json/composer.json) so the user sees the updated code running.
5. Report: what changed (files touched, commit summary), and whether the dev server restarted cleanly.

### Step 3b: Push path
1. Stage and commit any uncommitted relevant changes (ask before committing unrelated/unexpected files).
2. `git push origin HEAD:<branch>`
3. If the push is rejected (non-fast-forward), fetch and merge/rebase, resolve conflicts as in Step 3a, then retry.
4. Report the resulting commit hash and, if the repo has a remote URL, the compare/PR URL.

### Step 4: Confirm before destructive steps
Never force-push, never `git reset --hard`, never discard stashed/uncommitted work without explicit confirmation. If a force-push seems like the only path forward, stop and ask the user first.
