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

echo "All deployments complete!"