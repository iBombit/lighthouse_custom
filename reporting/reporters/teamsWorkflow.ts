import https from 'https';
import type * as LH from 'lighthouse/types/lh.js';
import logger from "../../logger/logger.js";
import { buildTeamsMessageCard } from './teamsMessageCard.js';

export async function sendMetricsToTeamsWorkflow(workflowUrl: string, flowResult: LH.FlowResult): Promise<void> {
  logger.debug("[REPORT] Sending metrics to Teams Workflow...");

  const payload = buildTeamsMessageCard(flowResult);

  const workflowEndpoint = new URL(workflowUrl);

  const options: https.RequestOptions = {
    hostname: workflowEndpoint.hostname,
    path: workflowEndpoint.pathname + workflowEndpoint.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = https.request(options, res => {
    res.on('data', d => process.stdout.write(d));
    logger.debug("[REPORT] Teams Workflow response: ");
  });

  req.on('error', e => {
    logger.debug("[REPORT] Error sending metrics to Teams Workflow: " + e.message);
  });

  req.write(JSON.stringify(payload));
  req.end();
}
