#!/bin/bash

echo "Deploying JustSplit App..."

# Build the JustSplit app using NX
echo "Building JustSplit app..."
nx build justsplit-app --configuration=production

# Deploy to Firebase
echo "Deploying to Firebase..."
cd firebase/justsplit
firebase deploy --only hosting:justsplit-app,firestore

echo "JustSplit deployment complete!"