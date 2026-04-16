#!/bin/bash
cd /Users/supermac/cardscout

git fetch origin main

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
  git stash
  git pull --rebase
  git stash pop
fi
