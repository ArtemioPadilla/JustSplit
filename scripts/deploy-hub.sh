#!/bin/bash

echo "Deploying JustSplit Hub..."

# Build the hub app using NX
echo "Building hub app..."
nx build hub --configuration=production

# Deploy to Firebase
echo "Deploying to Firebase..."
cd firebase/hub
firebase deploy --only hosting:justsplit-hub,firestore

echo "Hub deployment complete!"