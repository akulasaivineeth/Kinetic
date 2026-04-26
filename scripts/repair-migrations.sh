#!/bin/bash

# This script repairs the Supabase migration history by marking standardized filenames as applied.
# It targets the currently linked project in the Supabase CLI.

echo "Starting migration history repair..."

VERSIONS=(
  "20260101000001"
  "20260101000002"
  "20260404000000"
  "20260406000000"
  "20260407000000"
  "20260408000000"
  "20260409000000"
  "20260410000000"
  "20260411000000"
  "20260413000000"
  "20260414000000"
  "20260416000000"
  "20260417000000"
  "20260417000001"
  "20260421125650"
  "20260423140000"
  "20260424000001"
)

OLD_VERSIONS=(
  "001"
  "002"
  "20260404"
  "20260406"
  "20260407"
  "20260408"
  "20260409"
  "20260410"
  "20260411"
  "20260413"
  "20260414"
  "20260416"
  "20260417"
)

echo "Cleaning up old migration records (reverting short versions)..."
for v in "${OLD_VERSIONS[@]}"; do
  echo "Reverting old version: $v"
  supabase migration repair --status reverted "$v"
done

echo "Ensuring new versions are marked as applied..."
for v in "${VERSIONS[@]}"; do
  echo "Repairing version: $v"
  supabase migration repair --status applied "$v"
done

echo "Repair complete. You can now try 'supabase db pull' or 'supabase db push'."
