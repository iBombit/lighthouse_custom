# reporting

## reporting/createReport.js

The `reporting/createReport.js` file is responsible for generating and sending reports.

**CreateReport**

- **Properties**:
  - `ddHost`: Datadog host.
  - `ddKey`: Datadog API key.
  - `teamsWebhookUrl`: Teams webhook URL.

**Methods**

- `constructor`: Initializes the report with Datadog and Teams webhook configurations.
- `createReports`: Generates HTML and JSON reports and sends metrics to Datadog and Teams.
- `sendMetricsToDD`: Sends performance metrics to Datadog.
- `sendMetricsToTeams`: Sends performance metrics to Microsoft Teams.
- `extractApplicationName`: Extracts the application name from a URL.