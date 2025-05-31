#!/bin/bash

echo "Deploying JustSplit App..."

# Build the JustSplit app using npm directly
echo "Building JustSplit app..."
cd apps/justsplit && npm run build && cd ../..

# Deploy to Firebase
echo "Deploying to Firebase..."
firebase deploy --only hosting:justsplit-app,firestore --project justsplit-eef51

echo "JustSplit deployment complete!"