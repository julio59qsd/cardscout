#!/bin/bash

# Processeur automatique — fonctionne sur les DEUX ordis
# Lance-le une fois dans un terminal : ./processeur.sh

QUEUE="$HOME/.cardscout_queue.txt"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Processeur démarré — en attente de corrections..."
echo "   (laisse ce terminal ouvert)"
echo ""

while true; do
    cd "$DIR"

    # Récupérer les corrections de l'autre ordi d'abord
    git fetch --quiet
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)
    if [ "$LOCAL" != "$REMOTE" ]; then
        echo "📥 Nouvelles corrections de l'autre ordi..."
        git pull --rebase --quiet
        echo "✅ Synchronisé"
        echo ""
    fi

    # Traiter la prochaine correction en attente
    if [ -f "$QUEUE" ] && [ -s "$QUEUE" ]; then
        NEXT=$(head -n 1 "$QUEUE")

        if [ -n "$NEXT" ]; then
            echo "📤 Envoi : $NEXT"

            if git diff --quiet && git diff --cached --quiet; then
                echo "⚠️  Aucun changement détecté — correction ignorée"
            else
                git add .
                git commit -m "$NEXT"
                # Récupérer une dernière fois avant de pousser
                git pull --rebase --quiet
                git push
                echo "✅ Envoyé : $NEXT"
            fi

            tail -n +2 "$QUEUE" > "$QUEUE.tmp" && mv "$QUEUE.tmp" "$QUEUE"
            echo ""
        fi
    fi

    sleep 5
done
