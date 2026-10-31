import https from 'https';
import type * as LH from 'lighthouse/types/lh.js';
import logger from "../../logger/logger.js";
import { buildTeamsMessageCard } from './teamsMessageCard.js';

export async function sendMetricsToTeams(webhookUrl: string, flowResult: LH.FlowResult): Promise<void> {
  logger.debug("[REPORT] Sending metrics to Teams via webhook...");

  const payload = buildTeamsMessageCard(flowResult);

  const options: https.RequestOptions = {
    hostname: new URL(webhookUrl).hostname,
    path: new URL(webhookUrl).pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = https.request(options, res => {
    res.on('data', d => process.stdout.write(d));
    logger.debug("[REPORT] Teams response: ");
  });

  req.on('error', e => {
    logger.debug("[REPORT] Error sending metrics to Teams: " + e.message);
  });

  req.write(JSON.stringify(payload));
  req.end();
}
