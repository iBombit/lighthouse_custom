import fs from 'fs/promises';
import path from 'path';
import logger from "lh-pptr-framework/logger/logger.js";
import * as params from 'lh-pptr-framework/settings/testParams.js';

const PERFORMANCE_THRESHOLDS = {
    // Core Web Vitals
    'performance': { good: 90, poor: 50, unit: 'score', category: 'Core Web Vitals' },
    'first-contentful-paint': { good: 1800, poor: 3000, unit: 'ms', category: 'Core Web Vitals' },
    'largest-contentful-paint': { good: 2500, poor: 4000, unit: 'ms', category: 'Core Web Vitals' },
    'cumulative-layout-shift': { good: 0.1, poor: 0.25, unit: 'score', category: 'Core Web Vitals' },
    'total-blocking-time': { good: 200, poor: 600, unit: 'ms', category: 'Core Web Vitals' },

    // Other Performance Metrics
    'speed-index': { good: 3400, poor: 5800, unit: 'ms', category: 'Performance' },
    'interactive': { good: 3800, poor: 7300, unit: 'ms', category: 'Performance' },
    'max-potential-fid': { good: 100, poor: 300, unit: 'ms', category: 'Performance' },
    'main-thread-tasks': { good: 50, poor: 100, unit: 'count', category: 'Performance' },

    // Network Metrics
    'network-requests': { good: 2000, poor: 4000, unit: 'ms', category: 'Network' },
    'network-rtt': { good: 150, poor: 300, unit: 'ms', category: 'Network' },
    'network-server-latency': { good: 600, poor: 1500, unit: 'ms', category: 'Network' },
    'total-byte-weight': { good: 1600, poor: 3000, unit: 'KB', category: 'Network' },
    'uses-optimized-images': { good: 85, poor: 40, unit: 'KB', category: 'Network' },
    'uses-text-compression': { good: 10, poor: 40, unit: 'KB', category: 'Network' },
    'longest-first-party-request': { good: 1000, poor: 3000, unit: 'ms', category: 'Network' },
    'slowest-network-request': { good: 1000, poor: 3000, unit: 'ms', category: 'Network' },
};

function getThresholdStatus(value, thresholds, metricKey) {
    if (!thresholds || value === undefined || value === null) {
        return 'N/A';
    }

    const lowerIsBetterMetrics = [
        'first-contentful-paint', 'largest-contentful-paint', 'cumulative-layout-shift',
        'total-blocking-time', 'speed-index', 'interactive',
        'max-potential-fid', 'network-rtt', 'network-server-latency',
        'longest-first-party-request', 'slowest-network-request',
        'main-thread-tasks', 'network-requests',
        'total-byte-weight', 'uses-optimized-images', 'uses-text-compression'
    ];

    const isLowerBetter = lowerIsBetterMetrics.includes(metricKey);
    const goodCondition = isLowerBetter ? value <= thresholds.good : value >= thresholds.good;
    const poorCondition = isLowerBetter ? value <= thresholds.poor : value >= thresholds.poor;
    
    return goodCondition ? 'GOOD' : poorCondition ? 'NEEDS IMPROVEMENT' : 'POOR';
}

function extractApplicationName(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname ? urlObj.hostname.split('.')[0] : 'unknown';
    } catch (e) {
        logger.debug(`Error extracting application name: ${e}`);
        return 'unknown';
    }
}

function generateTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
}

function getReportFileName(baseName, extension) {
    return params.includeTimestamp ? `${baseName}_${generateTimestamp()}.${extension}` : `${baseName}.${extension}`;
}

export async function generateCSVReport(flowResult) {
    logger.debug("[REPORT] Generating CSV performance report...");

    try {
        const csvData = [];
        const headers = [
            'Timestamp',
            'Step Name',
            'Step Type',
            'URL',
            'Application',
            'Device Type',
            'Performance Score',
            'Metric Name',
            'Metric Value',
            'Metric Unit',
            'Metric Category',
            'Good Threshold',
            'Poor Threshold',
            'Threshold Status',
            'Improvement Needed',
            'Priority Level'
        ];

        csvData.push(headers.join(','));

        const timestamp = new Date().toISOString();
        const deviceType = params.browserType || 'desktop';

        flowResult.steps.forEach(step => {
            const stepName = step.name || 'Unknown Step';
            const stepType = getStepType(step);
            
            if (stepType === 'Unknown') { // Only process Navigation and Timespan steps
                return;
            }
            const url = step.lhr?.finalDisplayedUrl || step.lhr?.requestedUrl || 'N/A';
            const applicationName = extractApplicationName(url);
            const performanceScore = step.lhr?.categories?.performance?.score;
            const metrics = [];

            if (performanceScore !== undefined && PERFORMANCE_THRESHOLDS['performance']) {
                const perfScoreValue = Math.round(performanceScore * 100);
                metrics.push({
                    key: 'performance',
                    title: 'Performance Score',
                    value: perfScoreValue,
                    unit: null
                });
            }

            if (step.lhr?.audits) {
                Object.entries(step.lhr.audits).forEach(([auditKey, audit]) => {
                    if (audit.numericValue !== undefined && PERFORMANCE_THRESHOLDS[auditKey]) {
                        let value = audit.numericValue;

                        if (auditKey === 'total-byte-weight') {
                            value = Math.round(value / 1024);
                        }

                        metrics.push({
                            key: auditKey,
                            title: audit.title || auditKey,
                            value: value,
                            unit: null
                        });
                    }
                });

            }

            metrics.forEach(metric => {
                const threshold = PERFORMANCE_THRESHOLDS[metric.key];
                if (threshold) {
                    const status = getThresholdStatus(metric.value, threshold, metric.key);
                    const isLowerBetter = !['performance'].includes(metric.key);

                    csvData.push([
                        timestamp,
                        stepName,
                        stepType,
                        url,
                        applicationName,
                        deviceType,
                        performanceScore ? Math.round(performanceScore * 100) : 'N/A',
                        metric.title,
                        formatMetricValue(metric.value),
                        metric.unit || threshold.unit,
                        threshold.category,
                        threshold.good,
                        threshold.poor,
                        status,
                        calculateImprovement(metric.value, threshold, isLowerBetter),
                        getPriorityLevel(metric.key, status)
                    ].join(','));
                }
            });
        });

        const reportsDirectory = './reports';
        const csvFileName = getReportFileName('performance-analysis', 'csv');
        const csvFilePath = path.join(reportsDirectory, csvFileName);
        const csvContent = csvData.join('\n');

        await fs.writeFile(csvFilePath, csvContent);
        return csvFilePath;
    } catch (error) {
        throw error;
    }
}

// Helper function to determine step type
function getStepType(step) {
    return step.lhr?.gatherMode === 'navigation' ? 'Navigation' : step.lhr?.gatherMode === 'timespan' ? 'Timespan' : 'Unknown';
}

// Helper function to format metric values
function formatMetricValue(value) {
    return typeof value === 'number' ? (value < 1 ? value.toFixed(4) : Math.round(value)) : value;
}

// Helper function to calculate improvement needed
function calculateImprovement(currentValue, threshold, lowerIsBetter) {
    if (!threshold || currentValue === undefined) return 'N/A';

    const goodCondition = lowerIsBetter ? currentValue <= threshold.good : currentValue >= threshold.good;
    if (goodCondition) return '-';

    const poorCondition = lowerIsBetter ? currentValue <= threshold.poor : currentValue >= threshold.poor;
    const target = poorCondition ? threshold.good : threshold.poor;
    const improvement = lowerIsBetter ? currentValue - target : target - currentValue;
    return improvement > 0 ? `${lowerIsBetter ? 'Reduce' : 'Increase'} by ${formatMetricValue(improvement)} ${threshold.unit}` : '-';
}

function getPriorityLevel(metricName, status) {
    const coreWebVitals = [
        'first-contentful-paint', 'largest-contentful-paint',
        'cumulative-layout-shift', 'total-blocking-time',
        'performance'
    ];
    const isCore = coreWebVitals.includes(metricName);
    
    return status === 'POOR' ? (isCore ? 'HIGH' : 'MEDIUM') :
           status === 'NEEDS IMPROVEMENT' ? (isCore ? 'MEDIUM' : 'LOW') :
           status === 'GOOD' ? '-' : 'UNKNOWN';
}

export async function sendMetricsToCSV(flowResult) {
    logger.debug("[REPORT] Sending metrics to CSV...");
    try {
        await generateCSVReport(flowResult);
        logger.debug("[REPORT] CSV report generated successfully");
    } catch (error) {
        logger.debug(`[REPORT] Error generating CSV report: ${error.message}`);
        throw error;
    }
}
