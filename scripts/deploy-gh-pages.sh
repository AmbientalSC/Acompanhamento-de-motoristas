#!/bin/bash

# Script para forçar deploy completo na branch gh-pages
echo "🚀 Iniciando deploy forçado para GitHub Pages..."

# Build do projeto
echo "📦 Fazendo build do projeto..."
npm run build

# Verificar se o build foi bem-sucedido
if [ ! -d "dist" ]; then
    echo "❌ Erro: Pasta dist não foi criada"
    exit 1
fi

echo "✅ Build concluído com sucesso!"

# Configurar git para deploy
git config --global user.name "github-actions[bot]"
git config --global user.email "github-actions[bot]@users.noreply.github.com"

# Fazer deploy para gh-pages
echo "🌐 Fazendo deploy para branch gh-pages..."
npx gh-pages --dist dist --force

echo "✅ Deploy concluído! Acesse: https://ambientalsc.github.io/Acompanhamento-de-motoristas/" 