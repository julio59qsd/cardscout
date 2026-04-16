#!/bin/bash

# Usage: ./envoyer.sh "description de la correction"
# Ajoute la correction à la file d'attente

MESSAGE=${1:-"correction sans titre"}
QUEUE="$HOME/.cardscout_queue.txt"

echo "$MESSAGE" >> "$QUEUE"
echo "✅ Correction ajoutée : $MESSAGE"
echo "📋 File d'attente :"
cat -n "$QUEUE"
echo ""
echo "Le processeur va l'envoyer automatiquement."
