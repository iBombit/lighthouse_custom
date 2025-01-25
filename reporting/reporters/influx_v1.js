import http from 'http';
import logger from "lh-pptr-framework/logger/logger.js";

/**
 * Sends performance metrics to InfluxDB.
 * @param {string} influxUrl - The URL to your InfluxDB instance.
 * @param {string} influxUsername - The username for InfluxDB.
 * @param {string} influxPassword - The password for InfluxDB.
 * @param {string} database - The database where data will be stored.
 * @param {Object} flowResult - The result object containing performance metrics.
 */
export async function sendMetricsToInfluxV1(influxUrl, influxUsername, influxPassword, database, flowResult) {
    logger.debug("[REPORT] Sending metrics to InfluxDB...");

    const dataPoints = flowResult.steps.flatMap(step => createDataPointsForStep(step, database)).join('\n');

    if (!dataPoints) {
        logger.debug("[REPORT] No data points to send to InfluxDB.");
        return;
    }

    try {
        const options = getRequestOptions(influxUrl, influxUsername, influxPassword, database);
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

function createDataPointsForStep(step, database) {
    const timestamp = new Date().getTime();
    const performanceScore = Math.round(step.lhr.categories.performance.score * 100);

    let perfScorePoints = [
        `performance,step=${sanitize(step.name)},database=${sanitize(database)} score=${performanceScore} ${timestamp}`
    ];

    const auditDataPoints = Object.entries(step.lhr.audits)
        .filter(([key, audit]) => audit.numericValue !== undefined)
        .map(([key, audit]) => {
            return `performance,step=${sanitize(step.name)},database=${sanitize(database)} ${key}=${audit.numericValue} ${timestamp}`;
        });

    return perfScorePoints.concat(auditDataPoints);
}

// Helper function to sanitize tag values by escaping commas and spaces
function sanitize(value) {
    return value.replace(/,/g, '\\,').replace(/ /g, '\\ ');
}

function getRequestOptions(influxUrl, influxUsername, influxPassword, database) {
    const url = new URL(influxUrl);
    return {
        hostname: url.hostname,
        port: url.port,
        path: `/write?db=${database}&precision=ms`,
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Authorization': 'Basic ' + Buffer.from(influxUsername + ':' + influxPassword).toString('base64'),
        }
    };
}