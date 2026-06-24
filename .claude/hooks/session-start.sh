#!/bin/bash
set -euo pipefail

# Only run in remote (cloud) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Fix the stop hook so it checks all git remotes, not just "origin".
# This repo pushes to "github" remote, not "origin", so the default
# script incorrectly reports unpushed commits every session.
STOP_HOOK="/root/.claude/stop-hook-git-check.sh"

if [ -f "$STOP_HOOK" ]; then
  # Only patch if it still has the broken single-remote check
  if grep -q 'upstream="origin/$current_branch"' "$STOP_HOOK" && ! grep -q 'any_remote_current' "$STOP_HOOK"; then
    sed -i 's|current_branch=\$(git branch --show-current)\nif \[\[ -n "\$current_branch" \]\]; then\n  if git rev-parse "origin/\$current_branch".*|REPLACED|' "$STOP_HOOK" 2>/dev/null || true

    # Use Python for reliable multi-line replacement
    python3 - "$STOP_HOOK" << 'PYEOF'
import sys

path = sys.argv[1]
with open(path, 'r') as f:
    content = f.read()

old = '''current_branch=$(git branch --show-current)
if [[ -n "$current_branch" ]]; then
  if git rev-parse "origin/$current_branch" >/dev/null 2>&1; then
    upstream="origin/$current_branch"
  else
    upstream="origin/HEAD"
  fi'''

new = '''current_branch=$(git branch --show-current)
if [[ -n "$current_branch" ]]; then
  any_remote_current=false
  for remote in $(git remote); do
    if git rev-parse "$remote/$current_branch" >/dev/null 2>&1; then
      ahead=$(git rev-list "$remote/$current_branch..HEAD" --count 2>/dev/null)
      if [[ "$ahead" -eq 0 ]]; then
        any_remote_current=true
        break
      fi
    fi
  done
  if [[ "$any_remote_current" == true ]]; then
    exit 0
  fi

  if git rev-parse "origin/$current_branch" >/dev/null 2>&1; then
    upstream="origin/$current_branch"
  else
    upstream="origin/HEAD"
  fi'''

if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print("Stop hook patched successfully.")
else:
    print("Stop hook already patched or pattern not found — skipping.")
PYEOF
  fi
fi

# Install dependencies if node_modules is missing or stale
cd "$CLAUDE_PROJECT_DIR"
if [ ! -d "node_modules" ]; then
  npm install
fi
