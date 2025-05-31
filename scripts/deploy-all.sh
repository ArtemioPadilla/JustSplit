#!/bin/bash

echo "Deploying all JustSplit applications..."

# Deploy Hub
echo "========================================="
echo "Deploying Hub..."
echo "========================================="
./scripts/deploy-hub.sh

# Deploy JustSplit
echo "========================================="
echo "Deploying JustSplit..."
echo "========================================="
./scripts/deploy-justsplit.sh

# Deploy Website
echo "========================================="
echo "Deploying Website..."
echo "========================================="
./scripts/deploy-website.sh

echo "All deployments complete!"