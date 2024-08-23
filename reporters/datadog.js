import https from 'https';
import logger from "logger-module/logger.js";

export async function sendMetricsToDD(ddHost, ddKey, flowResult) {
    logger.debug("[REPORT] Sending metrics to Datadog...");
    const now = Math.floor(Date.now() / 1000);

    const metricsToSend = flowResult.steps.flatMap(step => createMetricsForStep(step, now));

    try {
        const postData = JSON.stringify({ series: metricsToSend });
        const options = getHttpsOptions(ddHost, ddKey);

        const req = https.request(options, res => {
            res.on('data', d => process.stdout.write(d));
        });

        req.on('error', e => {
            logger.debug("[REPORT] Error sending metrics to Datadog: " + e.message);
        });

        req.write(postData);
        req.end();
    } catch (error) {
        logger.debug(`[REPORT] Error sending metrics to Datadog: ${error}`);
    }
}

function createMetricsForStep(step, now) {
    const applicationName = extractApplicationName(step.lhr.finalDisplayedUrl);
    const performanceScore = step.lhr.categories.performance.score * 100;
    const baseTags = [`step_name:${step.name}`, `application_name:${applicationName}`, 'environment:test'];

    const scoreMetric = {
        metric: 'website.performance.score',
        points: [[now, performanceScore]],
        type: 'gauge',
        tags: baseTags
    };

    const auditMetrics = Object.entries(step.lhr.audits)
        .filter(([key, audit]) => audit.numericValue !== undefined)
        .map(([key, audit]) => ({
            metric: `website.performance.${key.replace('-', '_')}`,
            points: [[now, audit.numericValue]],
            type: 'gauge',
            tags: baseTags
        }));

    return [scoreMetric, ...auditMetrics];
}

function getHttpsOptions(ddHost, ddKey) {
    return {
        hostname: ddHost,
        path: '/api/v1/series',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'DD-API-KEY': ddKey
        }
    };
}

function extractApplicationName(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname ? urlObj.hostname.split('.')[0] : '3rd-party';
    } catch (e) {
        logger.debug(e);
        return '3rd-party';
    }
}