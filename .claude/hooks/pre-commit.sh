#!/bin/bash
# Pre-commit hook for verification before git commits
# Tests changed files and verifies build succeeds

LOG_FILE=".claude/logs/pre-commit-$(date +%Y%m%d).log"
echo "=== Pre-commit hook started at $(date) ===" >> "$LOG_FILE"

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|jsx|ts|tsx)$')

if [ -n "$STAGED_FILES" ]; then
  echo "Staged files:" >> "$LOG_FILE"
  echo "$STAGED_FILES" >> "$LOG_FILE"

  # Test only changed files
  if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    echo "Running tests on changed files..." >> "$LOG_FILE"
    for file in $STAGED_FILES; do
      # Find related test files
      TEST_FILE=$(echo "$file" | sed 's/\.(js|jsx|ts|tsx)$/.test.\1/')
      if [ -f "$TEST_FILE" ]; then
        echo "Testing: $TEST_FILE" >> "$LOG_FILE"
        if npm test -- "$TEST_FILE" >> "$LOG_FILE" 2>&1; then
          echo "✅ Tests passed for $TEST_FILE" >> "$LOG_FILE"
        else
          echo "❌ Tests failed for $TEST_FILE" >> "$LOG_FILE"
          exit 1
        fi
      fi
    done
  fi
fi

# Build verification
if [ -f "package.json" ] && grep -q "\"build\"" package.json; then
  echo "Running build verification..." >> "$LOG_FILE"
  if npm run build >> "$LOG_FILE" 2>&1; then
    echo "✅ Build succeeded" >> "$LOG_FILE"
  else
    echo "❌ Build failed" >> "$LOG_FILE"
    exit 1
  fi
fi

echo "=== Pre-commit hook completed at $(date) ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
