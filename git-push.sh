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

# 2. Check if there's anything to commit
if git diff --quiet && git diff --cached --quiet; then
  echo "✅ Nothing to commit — working tree clean."
  exit 0
fi

# 3. Stage all changes
echo "📦 Staging changes..."
git add -A

# 4. Commit
MSG="${1:-auto-commit $(date '+%Y-%m-%d %H:%M:%S')}"
echo "📝 Committing: $MSG"
git commit -m "$MSG"

# 5. Push
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🚀 Pushing to origin/$BRANCH..."
git push origin "$BRANCH"

echo "✅ Done!"
