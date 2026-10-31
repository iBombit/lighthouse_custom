import http from 'http';
import https from 'https';
import type * as LH from 'lighthouse/types/lh.js';
import logger from "../../logger/logger.js";

/**
 * Sends performance metrics to InfluxDB.
 * @param influxUrl - The URL to your InfluxDB instance.
 * @param influxToken - The authentication token for InfluxDB.
 * @param org - Your InfluxDB organization.
 * @param bucket - The bucket where data will be stored.
 * @param flowResult - The result object containing performance metrics.
 */
export async function sendMetricsToInfluxV2(influxUrl: string, influxToken: string, org: string, bucket: string, flowResult: LH.FlowResult): Promise<void> {
    logger.debug("[REPORT] Sending metrics to InfluxDB...");

    const dataPoints = flowResult.steps.flatMap(step => createDataPointsForStep(step, bucket)).join('\n');

    if (!dataPoints) {
        logger.debug("[REPORT] No data points to send to InfluxDB.");
        return;
    }

    try {
        const options = getRequestOptions(influxUrl, influxToken, org, bucket);
        const httpLib = influxUrl.startsWith('http://') ? http : https;
        const req = httpLib.request(options, res => {
            let responseBody = '';
            res.on('data', d => responseBody += d);
            res.on('end', () => logger.debug(`[REPORT] Server response: ${responseBody}`));
        });

        req.on('error', e => {
            logger.debug("[REPORT] Error sending metrics to InfluxDB: " + e.message);
        });

        req.write(dataPoints);
        req.end();
    } catch (error) {
        logger.debug(`[REPORT] Error sending metrics to InfluxDB: ${error}`);
    }
}

function createDataPointsForStep(step: LH.FlowResult.Step, bucket: string): string[] {
    const timestamp = new Date().getTime();
    const performanceScore = Math.round(step.lhr.categories.performance.score! * 100);

    const perfScorePoints = [
        `performance,step=${sanitize(step.name)},bucket=${sanitize(bucket)} score=${performanceScore} ${timestamp}`
    ];

    const auditDataPoints = Object.entries(step.lhr.audits)
        .filter(([, audit]) => audit.numericValue !== undefined)
        .map(([key, audit]) => {
            return `performance,step=${sanitize(step.name)},bucket=${sanitize(bucket)} ${key}=${audit.numericValue} ${timestamp}`;
        });

    return perfScorePoints.concat(auditDataPoints);
}

// Helper function to sanitize tag values by escaping commas and spaces
function sanitize(value: string): string {
    return value.replace(/,/g, '\\,').replace(/ /g, '\\ ');
}

function getRequestOptions(influxUrl: string, influxToken: string, org: string, bucket: string): http.RequestOptions {
    const url = new URL(influxUrl);
    return {
        hostname: url.hostname,
        port: url.port,
        path: `/api/v2/write?org=${org}&bucket=${bucket}&precision=ms`,
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Authorization': `Token ${influxToken}`,
        }
    };
}
