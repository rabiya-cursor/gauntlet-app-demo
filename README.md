# demo/tools (Gauntlet Session 1 helpers, not app code)

This branch is deliberately separate from `demo/cost-lens` so agents working on Cost Lens never see it.

- `scripts/plant-bug.sh <branch>`: plants one deliberate bug in the "Last 7 days" card on a PR branch
  (`changePct = changeUsd / previousUsd` becomes `changeUsd / currentUsd`), keeps `npm test` green,
  commits "Tweak week-over-week calc" and pushes to the same branch.
- `fallback/`: the known-good shape of `src/lib/weekOverWeek.ts` (with the bug) and its test file,
  used only if the targeted edit can't find the line.

Run from your clone (it uses a throwaway worktree, so your checkout isn't touched):

    cd ~/code/gauntlet-app-demo
    git fetch origin demo/tools
    git show origin/demo/tools:scripts/plant-bug.sh > /tmp/plant-bug.sh
    bash /tmp/plant-bug.sh <branch>
