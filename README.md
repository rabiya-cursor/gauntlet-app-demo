# Cost Lens

Browser-only AWS cost dashboard. It reads `public/sample-costs.csv` or a CSV you upload with the same columns: `date`, `service`, `region`, `team_tag`, `cost_usd`. Nothing is sent to a server and no AWS credentials are used.

```bash
npm install
npm test
npm run dev -- --host 0.0.0.0 --port 5173
```
