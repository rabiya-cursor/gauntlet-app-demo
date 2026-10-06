# Cost Lens

A small AWS cost dashboard that runs entirely in the browser. It loads a sample CSV, or a file you upload with the same columns, and never asks for AWS credentials.

Columns: `date`, `service`, `region`, `team_tag`, `cost_usd`.

The sample covers 30 days (2026-09-01 through 2026-09-30), eight services, and two regions. NAT Gateway in us-east-1 is about 3× its normal daily cost on Sep 29 and Sep 30.

## Run

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## Test

```bash
npm test
```
