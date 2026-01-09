#!/bin/bash

# Recursively delete build artifacts and dependency directories

set -e

dirs=("node_modules" "dist" ".turbo")
files=("*.tsbuildinfo")

for dir in "${dirs[@]}"; do
  echo "Cleaning $dir directories..."
  find . -type d -name "$dir" -prune -exec rm -rf {} +
done

for file in "${files[@]}"; do
  echo "Cleaning $file files..."
  find . -type f -name "$file" -delete
done

echo "Done!"

