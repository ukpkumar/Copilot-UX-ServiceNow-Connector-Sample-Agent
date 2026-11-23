# ServiceNow-style connector contract

This sample uses existing Microsoft Copilot update records and maps them into a ServiceNow-style change record contract.

| Copilot update field | ServiceNow-style field | Purpose |
|---|---|---|
| Source item ID | `sysId` | Stable record identity |
| Roadmap ID | `number` | Human-readable `CHG` number |
| Title | `shortDescription` | Work-queue title |
| Description | `description` | Full change detail |
| Product | `product` | Product filter |
| Source | `source` | Provenance |
| Rollout status | `status` | In development, Rolling out, or Generally available |
| Derived impact | `priority` | ServiceNow-style P1-P5 priority |
| Assessment phase | `state` | Assess, Plan, Implement, Monitor, or Closed |
| Owning team | `assignedTo` | Change owner |
| Source modified date | `modifiedOn` | Time-window filtering |
| Source link | `sourceUrl` | Open the authoritative Microsoft source |

The native Copilot component accepts an optional `records` array matching this contract. When no array is passed, the bundled sample records are used so the component can be tested immediately in Copilot Workbench.

For a live implementation, replace the bundled records with results from a ServiceNow action or API plugin while keeping the same properties schema.
