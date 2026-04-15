#!/bin/bash

# Deploy the Website app to Firebase Hosting
echo "Building website as static site..."
cd /Users/artemiopadilla/Documents/repos/GitHub/personal/JustSplit/apps/website
npm run build

echo "Copying preview.html to out directory..."
cp public/preview.html out/

echo "Deploying website to Firebase Hosting..."
cd /Users/artemiopadilla/Documents/repos/GitHub/personal/JustSplit
firebase deploy --only hosting:website