#!/bin/bash
cd /Users/supermac/cardscout

# Auto-push si modifications locales
if ! git diff --quiet || ! git diff --cached --quiet; then
  git add .
  git commit -m "autosave $(date '+%H:%M')"
fi

# Push si commits en avance
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main 2>/dev/null)
if [ "$LOCAL" != "$REMOTE" ]; then
  git push origin main 2>/dev/null
fi

# Pull si le remote est en avance
git fetch origin main 2>/dev/null
REMOTE=$(git rev-parse origin/main 2>/dev/null)
LOCAL=$(git rev-parse HEAD)
if [ "$LOCAL" != "$REMOTE" ]; then
  git pull --no-rebase 2>/dev/null
fi

echo "$(date '+%H:%M:%S') sync ok" >> /Users/supermac/cardscout/autopull.log
