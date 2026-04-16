#!/bin/bash

# Surveillance automatique — reçoit les corrections dès qu'elles arrivent
# Lance-le une fois sur l'autre ordi : ./recevoir.sh
# Il tourne en fond et se met à jour automatiquement

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "👂 En écoute — récupère les corrections automatiquement..."
echo "   (laisse ce terminal ouvert)"
echo ""

while true; do
    cd "$DIR"

    # Vérifier s'il y a du nouveau sur GitHub
    git fetch --quiet

    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)

    if [ "$LOCAL" != "$REMOTE" ]; then
        echo "📥 Nouvelle correction disponible !"
        git pull
        echo "✅ Mis à jour !"
        echo ""
    fi

    sleep 10
done
