import fs from 'fs/promises';
import logger from "../logger/logger.js";
import * as params from '../settings/testParams.js';
import { sendMetricsToDD } from './reporters/datadog.js';
import { sendMetricsToTeams } from './reporters/teamsWebhook.js';
import { sendMetricsToInfluxV1 } from './reporters/influx_v1.js';
import { sendMetricsToInfluxV2 } from './reporters/influx_v2.js';

const reportPath = './reports/user-flow.report.html';
const reportPathJson = './reports/user-flow.report.json';

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
        condition: () => params.teamsWorkflowUrl,
        action: () => logger.debug("[REPORT] Teams Workflow not implemented yet, sorry"),
        errorMessage: "[REPORT] Teams Workflow URL not provided. Skipping sending metrics"
      },
      {
        condition: () => params.influxUrl && params.influxUsername && params.influxPassword && params.influxDatabase,
        action: (flowResult) => sendMetricsToInfluxV1(params.influxUrl, params.influxUsername, params.influxPassword, params.influxDatabase, flowResult),
        errorMessage: "[REPORT] InfluxDB configuration not provided. Skipping sending metrics"
      },
      {
        condition: () => params.influxUrl && params.influxToken && params.influxOrg && params.influxBucket,
        action: (flowResult) => sendMetricsToInfluxV2(params.influxUrl, params.influxToken, params.influxOrg, params.influxBucket, flowResult),
        errorMessage: "[REPORT] InfluxDB configuration not provided. Skipping sending metrics"
      }
    ];
  }

  async createReports(flow) {
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