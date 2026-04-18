#!/bin/bash
# git-push.sh — One-command commit & push with auto lock cleanup
# Usage:
#   ./git-push.sh "your commit message"
#   ./git-push.sh                        (uses a default message with timestamp)

set -e

cd "$(dirname "$0")"

# 1. Clean ALL stale git locks
for lockfile in .git/index.lock .git/HEAD.lock .git/refs/heads/*.lock; do
  if [ -f "$lockfile" ]; then
    echo "🔓 Removing stale $lockfile..."
    rm -f "$lockfile"
  fi
done

# 2. Stage & commit if there are changes
git add -A
if git diff --cached --quiet; then
  echo "✅ Nothing new to commit."
else
  MSG="${1:-auto-commit $(date '+%Y-%m-%d %H:%M:%S')}"
  echo "📝 Committing: $MSG"
  git commit -m "$MSG"
fi

# 3. Push (always — even if nothing new was committed, there may be unpushed commits)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🚀 Pushing to origin/$BRANCH..."
git push origin "$BRANCH"

echo "✅ Done!"
