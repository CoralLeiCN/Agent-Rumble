---
name: merge-to-main
description: Squash completed changes from the current Codex task worktree or codex/* branch into the local main branch as one commit. Use when a user asks to merge, squash, land, or finalize Codex worktree changes into main while keeping new main history linear.
---

# Merge to Main

Move completed changes from the current Codex worktree into the separate worktree where `main` is checked out. Add one squash commit to `main`; keep intermediate commits only on the feature branch.

If the user asks only for an explanation, describe this workflow without changing the repository.

## Workflow

### 1. Inspect both worktrees

Run:

```bash
git status --short --branch
git branch --show-current
git worktree list --porcelain
```

Treat the current worktree as the source. Find the worktree whose entry contains `branch refs/heads/main`, and require its working tree to be clean:

```bash
git -C <main-worktree> status --short --branch
```

Stop if the main worktree contains uncommitted changes. Do not alter or stash changes owned by another task.

### 2. Prepare the Codex branch

If the current worktree is detached, create a focused branch:

```bash
git switch -c codex/<topic>
```

Review the diff, follow `AGENTS.md`, run relevant checks, and commit only the intended changes. Preserve unrelated changes.

### 3. Refresh main and update the feature branch

Fetch the latest remote `main`, then update the local `main` without rewriting
or discarding local commits:

```bash
git -C <main-worktree> fetch origin main
git -C <main-worktree> merge --ff-only origin/main
```

Stop if the fetch fails, `origin/main` is unavailable, or the fast-forward-only
merge fails. Do not continue using a stale remote-tracking ref, and do not reset
local `main` to resolve divergence.

Update the feature branch from the refreshed local `main`:

```bash
git merge-base --is-ancestor main <feature-branch>
```

If it fails, merge `main` into the feature branch, resolve conflicts there, and rerun relevant checks:

```bash
git merge main
```

Record the output of this command as `<main-before>`:

```bash
git -C <main-worktree> rev-parse main
```

Immediately before landing, fetch and fast-forward again:

```bash
git -C <main-worktree> fetch origin main
git -C <main-worktree> merge --ff-only origin/main
git -C <main-worktree> rev-parse main
```

Apply the same stop conditions if the fetch or fast-forward-only merge fails.
Confirm that `main` still equals `<main-before>`. If it moved, update and
validate the feature branch again, record the new `<main-before>`, and repeat
this immediate pre-landing refresh.

### 4. Squash into main

Run from the main worktree:

```bash
git -C <main-worktree> merge --squash <feature-branch>
git -C <main-worktree> diff --cached --stat
git -C <main-worktree> diff --cached --check
```

Confirm the staged diff matches the intended feature and run relevant checks. If nothing is staged, do not create an empty commit. Otherwise create one commit summarizing the feature:

```bash
git -C <main-worktree> commit -m "<feature summary>"
```

### 5. Verify the result

Run:

```bash
git -C <main-worktree> status --short --branch
git -C <main-worktree> rev-list --count <main-before>..main
git -C <main-worktree> rev-list --merges <main-before>..main
git -C <main-worktree> diff --exit-code main <feature-branch>
```

Require a clean main worktree, exactly one new commit, no new merge commit, and identical file trees on `main` and the feature branch. Do not expect their commit IDs to match after a squash.

## Safeguards

- Do not check out `main` in the Codex worktree; use its existing worktree.
- Never proceed with a cached `origin/main` after a failed fetch.
- Do not use destructive Git commands, force-push, or delete the branch or worktree.
- Stop and report conflicts or product decisions that cannot be resolved safely.
- Do not push or perform cleanup unless the user asks.

Report the feature branch, the new commit on `main`, and the checks run.
