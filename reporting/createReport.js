import fs from 'fs/promises';
import path from 'path';
import logger from "lh-pptr-framework/logger/logger.js";
import * as params from 'lh-pptr-framework/settings/testParams.js';
import { sendMetricsToDD } from 'lh-pptr-framework/reporting/reporters/datadog.js';
import { sendMetricsToTeams } from 'lh-pptr-framework/reporting/reporters/teamsWebhook.js';
import { sendMetricsToSlack } from 'lh-pptr-framework/reporting/reporters/slackWebhook.js';
import { sendMetricsToInfluxV1 } from 'lh-pptr-framework/reporting/reporters/influx_v1.js';
import { sendMetricsToInfluxV2 } from 'lh-pptr-framework/reporting/reporters/influx_v2.js';

const reportsDirectory = './reports';
const reportPath = path.join(reportsDirectory, 'user-flow.report.html');
const reportPathJson = path.join(reportsDirectory, 'user-flow.report.json');

export default class CreateReport {
  constructor() {
    this.reporters = [
      {
        condition: () => params.ddHost && params.ddKey,
        action: (flowResult) => sendMetricsToDD(params.ddHost, params.ddKey, flowResult),
        errorMessage: "[REPORT] Datadog API host or API key not provided. Skipping sending metrics"
      },
      {
        condition: () => params.webhook,
        action: (flowResult) => sendMetricsToTeams(params.webhook, flowResult),
        errorMessage: "[REPORT] Teams Webhook URL not provided. Skipping sending metrics"
      },
      {
        condition: () => params.slackWebhook,
        action: (flowResult) => sendMetricsToSlack(params.slackWebhook, flowResult),
        errorMessage: "[REPORT] Slack Webhook URL not provided. Skipping sending metrics"
      },
      {
        condition: () => params.teamsWorkflowUrl,
        action: () => logger.debug("[REPORT] Teams Workflow not implemented yet, sorry"),
        errorMessage: "[REPORT] Teams Workflow URL not provided. Skipping sending metrics"
      },
      {
        condition: () => params.influxUrl && params.influxUsername && params.influxPassword && params.influxDatabase,
        action: (flowResult) => sendMetricsToInfluxV1(params.influxUrl, params.influxUsername, params.influxPassword, params.influxDatabase, flowResult),
        errorMessage: "[REPORT] InfluxDB_V1 configuration not provided. Skipping sending metrics"
      },
      {
        condition: () => params.influxUrl && params.influxToken && params.influxOrg && params.influxBucket,
        action: (flowResult) => sendMetricsToInfluxV2(params.influxUrl, params.influxToken, params.influxOrg, params.influxBucket, flowResult),
        errorMessage: "[REPORT] InfluxDB_V2 configuration not provided. Skipping sending metrics"
      }
    ];
  }

  async createReports(flow) {
    // Ensure the reports directory exists
    await fs.mkdir(reportsDirectory, { recursive: true });
    logger.debug(`[REPORT] Reports directory ensured at ${reportsDirectory}`);

    const reportHTML = await flow.generateReport();
    let flowResult = await flow.createFlowResult();
    const reportJSON = JSON.stringify(flowResult, null, 2);

    await fs.writeFile(reportPath, reportHTML);
    await fs.writeFile(reportPathJson, reportJSON);

    logger.debug(`[REPORT] HTML path: ${reportPath}.html`);
    logger.debug(`[REPORT] JSON path: ${reportPathJson}.json`);

    await this.sendReports(flowResult);
  }

  async sendReports(flowResult) {
    for (const reporter of this.reporters) {
      if (reporter.condition()) {
        await reporter.action(flowResult);
      } else {
        logger.debug(reporter.errorMessage);
      }
    }
  }
}