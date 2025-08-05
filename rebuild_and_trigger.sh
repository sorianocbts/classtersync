#!/bin/bash

echo "🕐 Rebuild started at $(date)"

# Navigate to the project directory
cd /home/ubuntu/nginx-proxy/classtersync || {
  echo "❌ Failed to cd into /home/ubuntu/nginx-proxy/classtersync"
  exit 1
}

# Tear down and rebuild the container
docker-compose down
docker-compose build --no-cache
docker-compose up -d --force-recreate

# Wait one minute for the container to start
echo "⏳ Waiting 60 seconds for container to be ready..."
sleep 60

# Trigger the sync2 route
echo "🌐 Curling https://classtersync.cbtseminary.com/sync2"
curl -s https://classtersync.cbtseminary.com/sync2

echo "✅ Done at $(date)"
