import fs from 'fs/promises';
import logger from "../logger/logger.js";
import { sendMetricsToDD } from './reporters/datadog.js';
import { sendMetricsToTeams } from './reporters/teamsWebhook.js';
import { sendMetricsToInflux } from './reporters/influx_v2.js';

const reportPath = './reports/user-flow.report.html';
const reportPathJson = './reports/user-flow.report.json';

export default class CreateReport {
  constructor(ddHost, ddKey, teamsWebhookUrl, teamsWorkflowUrl, influxUrl, influxToken, influxOrg, influxBucket) {
    this.ddHost = ddHost;
    this.ddKey = ddKey;
    this.teamsWebhookUrl = teamsWebhookUrl;
    this.teamsWorkflowUrl = teamsWorkflowUrl;
    this.influxUrl = influxUrl;
    this.influxToken = influxToken;
    this.influxOrg = influxOrg;
    this.influxBucket = influxBucket;
  }

  async createReports(flow) {
    const reportHTML = await flow.generateReport();
    const flowResult = await flow.createFlowResult();
    const reportJSON = JSON.stringify(flowResult, null, 2);

    await fs.writeFile(reportPath, reportHTML);
    await fs.writeFile(reportPathJson, reportJSON);

    logger.debug("[REPORT] HTML path: " + reportPath);
    logger.debug("[REPORT] JSON path: " + reportPathJson);

    if (this.ddHost && this.ddKey) {
      await sendMetricsToDD(this.ddHost, this.ddKey, flowResult);
    } else {
      logger.debug("[REPORT] Datadog API host or API key not provided. Skipping sending metrics");
    }

    if (this.teamsWebhookUrl) {
      await sendMetricsToTeams(this.teamsWebhookUrl, flowResult);
    }
    else {
      logger.debug("[REPORT] Teams Webhook URL not provided. Skipping sending metrics");
    }

    if (this.teamsWorkflowUrl) {
      logger.debug("[REPORT] Teams Workflow not implemented yet, sorry");
    }
    else {
      logger.debug("[REPORT] Teams Workflow URL not provided. Skipping sending metrics");
    }

    if (this.influxUrl && this.influxToken && this.influxOrg && this.influxBucket) {
      await sendMetricsToInflux(this.influxUrl, this.influxToken, this.influxOrg, this.influxBucket, flowResult);
      logger.debug("[REPORT] Metrics sent to InfluxDB successfully.");
    } else {
      logger.debug("[REPORT] InfluxDB configuration not provided. Skipping sending metrics");
    }
  }
}