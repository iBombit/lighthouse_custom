import https from 'https';
import type * as LH from 'lighthouse/types/lh.js';
import logger from "../../logger/logger.js";

/** A gauge series point in the Datadog v1 `series` payload. */
interface DatadogMetric {
    metric: string;
    points: Array<[number, number]>;
    type: 'gauge';
    tags: string[];
}

export async function sendMetricsToDD(ddHost: string, ddKey: string, flowResult: LH.FlowResult): Promise<void> {
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

function createMetricsForStep(step: LH.FlowResult.Step, now: number): DatadogMetric[] {
    const applicationName = extractApplicationName(step.lhr.finalDisplayedUrl);
    const performanceScore = step.lhr.categories.performance.score! * 100;
    const baseTags = [`step_name:${step.name}`, `application_name:${applicationName}`, 'environment:test'];

    const scoreMetric: DatadogMetric = {
        metric: 'website.performance.score',
        points: [[now, performanceScore]],
        type: 'gauge',
        tags: baseTags
    };

    const auditMetrics = Object.entries(step.lhr.audits)
        .filter(([, audit]) => audit.numericValue !== undefined)
        .map(([key, audit]): DatadogMetric => ({
            // Only the first '-' is replaced; metric names are kept stable for existing dashboards.
            metric: `website.performance.${key.replace('-', '_')}`,
            points: [[now, audit.numericValue!]],
            type: 'gauge',
            tags: baseTags
        }));

    return [scoreMetric, ...auditMetrics];
}

function getHttpsOptions(ddHost: string, ddKey: string): https.RequestOptions {
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

function extractApplicationName(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname ? urlObj.hostname.split('.')[0] : '3rd-party';
    } catch (e) {
        logger.debug(e);
        return '3rd-party';
    }
}
