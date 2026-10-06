#!/usr/bin/env bash
# plant-bug.sh <branch>
# Demo helper for rabiya-cursor/gauntlet-app-demo (Gauntlet Session 1).
# Plants ONE deliberate bug in the "Last 7 days" card so Bugbot has something real to find:
#   changePct = changeUsd / previousUsd   ->   changePct = changeUsd / currentUsd
# Works in a throwaway git worktree, so your current checkout is never touched.
# Keeps npm test green (if a test asserts a non-zero percentage, it swaps in the
# known-good test file that only checks the 0% / null cases), commits
# "Tweak week-over-week calc" and pushes to the same branch (so the same PR updates).
# Works with macOS bash 3.2 + perl (no GNU sed needed).
set -euo pipefail

BRANCH="${1:-}"
if [ -z "$BRANCH" ]; then
  echo "usage: $0 <branch>   (e.g. cursor/last-7-days-ab12; see: gh pr list --base demo/cost-lens)" >&2
  exit 1
fi

REPO_DIR="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_DIR" ]; then
  echo "Run this from inside your gauntlet-app-demo clone (e.g. cd ~/code/gauntlet-app-demo)." >&2
  exit 1
fi
cd "$REPO_DIR"

TOOLS_REF="origin/demo/tools"
LIB="src/lib/weekOverWeek.ts"
TEST="src/lib/weekOverWeek.test.ts"
WT="$(mktemp -d "${TMPDIR:-/tmp}/plant-bug.XXXXXX")"
cleanup() { cd "$REPO_DIR"; git worktree remove --force "$WT" >/dev/null 2>&1 || rm -rf "$WT"; git worktree prune; }
trap cleanup EXIT

echo "==> Fetching origin/$BRANCH and $TOOLS_REF"
git fetch -q origin "$BRANCH" demo/tools
git worktree add -q --detach "$WT" "origin/$BRANCH"
cd "$WT"

# 1) Find the file with the percentage calc. Prefer the agreed path, else search src/lib.
has_prev_division() { perl -ne '$f=1 if m{/\s*\(?\s*(previousUsd|previous|prevUsd|prev)\b}; END { exit($f ? 0 : 1) }' "$1"; }
TARGET=""
if [ -f "$LIB" ] && has_prev_division "$LIB"; then
  TARGET="$LIB"
else
  for f in $(grep -rlE 'changePct|pctChange|percentChange|changePercent' src/lib 2>/dev/null | grep -v '[.]test[.]ts$' || true); do
    if has_prev_division "$f"; then TARGET="$f"; break; fi
  done
fi

PLANTED=0
if [ -n "$TARGET" ]; then
  echo "==> Planting in $TARGET"
  # Pass A: the division on a line that names the percentage (never the "=== 0" guard).
  perl -pi -e '
    BEGIN { %c = (previousUsd=>"currentUsd", previous=>"current", prevUsd=>"currUsd", prev=>"curr"); }
    if (!$done && /(pct|percent)/i) {
      $done = 1 if s{/\s*(\(?\s*)(previousUsd|previous|prevUsd|prev)\b}{"/ $1$c{$2}"}e;
    }
  ' "$TARGET"
  # Pass B: "(current - previous) / previous" written without a pct name on the line.
  if git diff --quiet -- "$TARGET"; then
    perl -pi -e '
      BEGIN { %c = (previousUsd=>"currentUsd", previous=>"current", prevUsd=>"currUsd", prev=>"curr"); }
      if (!$done) { $done = 1 if s{(-\s*(?:previousUsd|previous|prevUsd|prev)\s*\)\s*)/\s*(previousUsd|previous|prevUsd|prev)\b}{"$1/ $c{$2}"}e; }
    ' "$TARGET"
  fi
  if ! git diff --quiet -- "$TARGET"; then
    PLANTED=1
    # Sanity: the new denominator must be a name that exists elsewhere in the file, else undo.
    NEWVAR="$(git diff -U0 -- "$TARGET" | grep '^+[^+]' | perl -ne 'if (m{/\s*\(?\s*(currentUsd|current|currUsd|curr)\b}) { print "$1\n"; exit }')"
    COUNT="$(perl -ne '$n++ while /\b\Q'"$NEWVAR"'\E\b/g; END { print $n+0 }' "$TARGET")"
    if [ -z "$NEWVAR" ] || [ "$COUNT" -lt 2 ]; then
      echo "    '$NEWVAR' isn't defined in $TARGET; undoing the targeted edit."
      git checkout -- "$TARGET"; PLANTED=0
    fi
  fi
fi

if [ "$PLANTED" -eq 0 ]; then
  echo "==> Targeted edit didn't match. FALLBACK: using the known version of $LIB + $TEST from $TOOLS_REF"
  echo "    (same exported API: weekOverWeek(rows) -> { currentUsd, previousUsd, changeUsd, changePct, ... } | null)"
  mkdir -p src/lib
  git show "$TOOLS_REF:fallback/weekOverWeek.ts" > "$LIB"
  git show "$TOOLS_REF:fallback/weekOverWeek.test.ts" > "$TEST"
  TARGET="$LIB"
fi

echo "==> The planted line:"
git diff -U0 -- "$TARGET" | grep '^[-+][^-+]' || true

# 2) Tests must stay green so Bugbot (not CI) is what catches it.
echo "==> npm install + npm test (about 20-40 s)"
npm install --silent --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund
if ! npm test >/tmp/plant-bug-test.log 2>&1; then
  echo "==> A test caught the bug (expected). Swapping in the known-good test file that doesn't assert a non-zero %."
  git show "$TOOLS_REF:fallback/weekOverWeek.test.ts" > "$TEST"
  if ! npm test >/tmp/plant-bug-test.log 2>&1; then
    echo "!! Tests still failing. NOT pushing. Log: /tmp/plant-bug-test.log" >&2
    tail -n 40 /tmp/plant-bug-test.log >&2
    exit 1
  fi
fi
grep -E 'Tests +[0-9]+' /tmp/plant-bug-test.log || true
if ! npx tsc --noEmit >/tmp/plant-bug-tsc.log 2>&1; then
  echo "!! TypeScript errors after planting. NOT pushing. Log: /tmp/plant-bug-tsc.log" >&2
  tail -n 20 /tmp/plant-bug-tsc.log >&2
  exit 1
fi

# 3) Commit + push to the same branch (updates the same PR).
git add -- src/lib
git -c commit.gpgsign=false commit -q -m "Tweak week-over-week calc"
git push -q origin "HEAD:refs/heads/$BRANCH"
echo "==> Pushed $(git rev-parse --short HEAD) 'Tweak week-over-week calc' to $BRANCH"
echo "    Next: gh pr ready <PR#>  then comment 'bugbot run' on the PR."
