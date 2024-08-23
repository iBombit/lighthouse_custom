import http from 'http';
import logger from "logger-module/logger.js";

/**
 * Sends performance metrics to InfluxDB.
 * @param {string} influxUrl - The URL to your InfluxDB instance.
 * @param {string} influxToken - The authentication token for InfluxDB.
 * @param {string} org - Your InfluxDB organization.
 * @param {string} bucket - The bucket where data will be stored.
 * @param {Object} flowResult - The result object containing performance metrics.
 */
export async function sendMetricsToInfluxV2(influxUrl, influxToken, org, bucket, flowResult) {
    logger.debug("[REPORT] Sending metrics to InfluxDB...");

    const dataPoints = flowResult.steps.flatMap(step => createDataPointsForStep(step, bucket)).join('\n');

    if (!dataPoints) {
        logger.debug("[REPORT] No data points to send to InfluxDB.");
        return;
    }

    try {
        const options = getRequestOptions(influxUrl, influxToken, org, bucket);
        const req = http.request(options, res => {
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

function createDataPointsForStep(step, bucket) {
    const timestamp = new Date().getTime();
    const performanceScore = Math.round(step.lhr.categories.performance.score * 100);

    let perfScorePoints = [
        `performance,step=${sanitize(step.name)},bucket=${sanitize(bucket)} score=${performanceScore} ${timestamp}`
    ];

    const auditDataPoints = Object.entries(step.lhr.audits)
        .filter(([key, audit]) => audit.numericValue !== undefined)
        .map(([key, audit]) => {
            return `performance,step=${sanitize(step.name)},bucket=${sanitize(bucket)} ${key}=${audit.numericValue} ${timestamp}`;
        });

    return perfScorePoints.concat(auditDataPoints);
}

// Helper function to sanitize tag values by escaping commas and spaces
function sanitize(value) {
    return value.replace(/,/g, '\\,').replace(/ /g, '\\ ');
}

function getRequestOptions(influxUrl, influxToken, org, bucket) {
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