#!/bin/bash

echo "Deploying CyberEco JustSplit App..."

# Build the JustSplit app using npm directly
echo "Building CyberEco JustSplit app..."
cd apps/justsplit && npm run build && cd ../..

# Deploy to Firebase
echo "Deploying to Firebase..."
firebase deploy --only hosting:justsplit-app,firestore --project justsplit-eef51

echo "CyberEco JustSplit deployment complete!"