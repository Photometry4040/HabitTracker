#!/bin/bash
# Post-tool-use hook for code quality enforcement
# Runs after each tool execution to maintain code standards

LOG_FILE=".claude/logs/post-tool-use-$(date +%Y%m%d).log"
echo "=== Post-tool-use hook started at $(date) ===" >> "$LOG_FILE"

# Function to log and execute
run_check() {
  local cmd="$1"
  local desc="$2"
  echo "Running: $desc" >> "$LOG_FILE"
  if eval "$cmd" >> "$LOG_FILE" 2>&1; then
    echo "✅ $desc passed" >> "$LOG_FILE"
    return 0
  else
    echo "❌ $desc failed" >> "$LOG_FILE"
    return 1
  fi
}

# ESLint check
if [ -f "package.json" ] && grep -q "eslint" package.json; then
  run_check "npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0" "ESLint"
fi

# Prettier formatting
if [ -f "package.json" ] && grep -q "prettier" package.json; then
  run_check "npx prettier --check ." "Prettier"
fi

# TypeScript type checking
if [ -f "tsconfig.json" ]; then
  run_check "npx tsc --noEmit" "TypeScript"
fi

echo "=== Post-tool-use hook completed at $(date) ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
