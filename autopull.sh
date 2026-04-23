#!/bin/bash
export PATH="/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:$PATH"
REPO="/Users/assistantecommerciale/Desktop/mon-premier-site/cardscout"
LOG="$REPO/autopull.log"
cd "$REPO" || exit 1

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }

# 1. Commit local si modifs
if ! git diff --quiet || ! git diff --cached --quiet; then
  git add .
  if git commit -m "autosave $(date '+%H:%M')" >> "$LOG" 2>&1; then
    log "commit ok"
  else
    log "commit FAILED"
  fi
fi

# 2. Fetch remote
if ! git fetch origin main >> "$LOG" 2>&1; then
  log "fetch FAILED - abort"
  exit 1
fi

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main 2>/dev/null)
BASE=$(git merge-base HEAD origin/main 2>/dev/null)

# 3. Rebase si remote en avance (les deux branches ont divergé ou remote seul avance)
if [ "$LOCAL" != "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
  if [ "$BASE" != "$REMOTE" ]; then
    # Remote a des commits qu'on n'a pas → rebase
    if git rebase origin/main >> "$LOG" 2>&1; then
      log "rebase ok"
    else
      log "rebase CONFLICT - auto-resolve data/ with --theirs"
      # Conflits sur data/*.json → on prend la version remote (la plus récente gagne au prochain cycle)
      git checkout --theirs -- 'data/*.json' 2>/dev/null
      git add data/ 2>/dev/null
      if git rebase --continue >> "$LOG" 2>&1; then
        log "rebase resolved"
      else
        log "rebase UNRESOLVABLE - abort"
        git rebase --abort 2>/dev/null
        exit 1
      fi
    fi
  fi
fi

# 4. Push
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main 2>/dev/null)
if [ "$LOCAL" != "$REMOTE" ]; then
  if git push origin main >> "$LOG" 2>&1; then
    log "push ok"
  else
    log "push FAILED"
  fi
fi

log "sync ok"
