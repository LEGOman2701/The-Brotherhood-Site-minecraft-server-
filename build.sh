#!/bin/bash
set -e

echo "Installing all dependencies including dev..."
npm install

echo "Running database migrations..."
npx drizzle-kit push

echo "Running build with Node directly..."
node script/build.js
