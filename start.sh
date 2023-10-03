#!/bin/sh
echo "server starting..."
while :
do
  git pull
  yarn run compile
  yarn run dist -- src/config/$1.json
  echo "server restarting..."
  sleep 5s
done
