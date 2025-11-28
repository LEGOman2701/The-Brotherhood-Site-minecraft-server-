#!/bin/bash
set -e

echo "Installing dependencies..."
npm ci --include=dev

echo "Running build..."
npm run build
