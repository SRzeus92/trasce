#!/bin/bash
# Script per pulire tutti i processi del progetto ft_trascendence

echo "🧹 Pulizia processi ft_trascendence..."

# 1. Ferma container Docker
echo "📦 Fermando container Docker..."
sudo docker-compose down 2>/dev/null || echo "Docker già fermo"

# 2. Uccidi processi npm/node del progetto
echo "🔪 Terminando processi npm/node..."
pkill -f "npm.*data-service" 2>/dev/null
pkill -f "npm.*game-service" 2>/dev/null
pkill -f "fastify.*data-service" 2>/dev/null
pkill -f "fastify.*game-service" 2>/dev/null

# 3. Verifica processi rimasti
REMAINING=$(pgrep -f "ft_trascendence.*node" | wc -l)
if [ $REMAINING -eq 0 ]; then
    echo "✅ Tutti i processi sono stati fermati"
else
    echo "⚠️  Ci sono ancora $REMAINING processi attivi"
    pgrep -f "ft_trascendence.*node" -a
fi

echo "✅ Pulizia completata!"
