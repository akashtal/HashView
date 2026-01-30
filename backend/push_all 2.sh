#!/bin/bash

# 1. Push the Main Project (including frontend and backend files)
echo "🚀 Pushing Main Project (HashView)..."
git push origin main

# 2. Push the Backend Project (only backend files to separate repo)
echo "🚀 Pushing Backend Repository (Hashview-backend)..."
cd backend || exit
git push origin main
cd .. || exit

echo "✅ All pushes completed!"
