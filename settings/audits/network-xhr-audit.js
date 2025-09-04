import { Audit } from 'lighthouse/core/audits/audit.js';
import UrlUtils from 'lighthouse/core/lib/url-utils.js';
import { NetworkRecords } from 'lighthouse/core/computed/network-records.js';
import { MainResource } from 'lighthouse/core/computed/main-resource.js';
import { EntityClassification } from 'lighthouse/core/computed/entity-classification.js';
import * as i18n from 'lighthouse/core/lib/i18n/i18n.js';

const UIStrings = {
    title: 'XHR Network Requests',
    failureTitle: 'XHR Network Requests',
    description: 'Lists the XHR/AJAX network requests that were made during page load, excluding static resources like images, CSS, and JS files.',
    columnCategory: 'Category',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class NetworkXHRAudit extends Audit {
    static get meta() {
        return {
            id: 'network-xhr-audit',
            scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
            title: str_(UIStrings.title),
            description: str_(UIStrings.description),
            requiredArtifacts: ['devtoolsLogs', 'URL', 'GatherContext'],
        };
    }

    static get defaultOptions() {
        return {
            p10: 1000,
            median: 2500,
        };
    }

    static isXHRRequest(record) {
        // Check if it's an XHR/Fetch request by examining various indicators
        const resourceType = record.resourceType;
        const mimeType = record.mimeType || '';
        const url = record.url.toLowerCase();

        // First exclude obvious non-XHR requests
        // Exclude static resources by extension
        const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map', '.webp'];
        const isStaticResource = staticExtensions.some(ext => url.includes(ext));
        
        if (isStaticResource) {
            return false;
        }

        // Exclude common static resource MIME types
        const staticMimeTypes = [
            'text/css', 'text/javascript', 'application/javascript',
            'image/', 'font/', 'audio/', 'video/',
            'text/html' // Usually not XHR
        ];
        
        if (staticMimeTypes.some(type => mimeType.startsWith(type))) {
            return false;
        }

        // Exclude advertising and tracking requests (common patterns)
        const adPatterns = [
            'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
            'facebook.com/tr', 'google-analytics.com', '/ads?', '/ad?',
            'adsystem.com', 'adnxs.com', 'amazon-adsystem.com'
        ];
        
        if (adPatterns.some(pattern => url.includes(pattern))) {
            return false;
        }

        // XHR/Fetch requests typically have these characteristics:
        // 1. Resource type is 'XHR' or 'Fetch'
        // 2. MIME type contains 'json', 'xml' for APIs
        // 3. Not a static resource or ad request
        
        if (resourceType === 'XHR') {
            return true; // XHR is almost always what we want
        }

        if (resourceType === 'Fetch') {
            // For Fetch requests, be more selective about MIME types
            const apiMimeTypes = [
                'application/json', 'application/xml', 'text/xml'
            ];
            
            if (apiMimeTypes.some(type => mimeType.includes(type))) {
                return true;
            }

            // Check for API-like URL patterns for Fetch requests
            const apiPatterns = ['/api/', '/ajax/', '/xhr/', '/rest/', '/graphql', '/json', '/data/'];
            if (apiPatterns.some(pattern => url.includes(pattern))) {
                return true;
            }

            // If it has a method other than GET and looks like an API call, it's likely XHR
            if (record.requestMethod && record.requestMethod !== 'GET') {
                return true;
            }
        }

        return false;
    }

    static async audit(artifacts, context) {
        const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
        const records = await NetworkRecords.request(devtoolsLog, context);
        const classifiedEntities = await EntityClassification.request({ URL: artifacts.URL, devtoolsLog }, context);
        const mainFrameId = await getMainFrameId(artifacts, context);

        // Filter only XHR requests
        const xhrRecords = records.filter(record => NetworkXHRAudit.isXHRRequest(record));

        const earliestRendererStartTime = getEarliestRendererStartTime(records);
        const normalizedRecords = xhrRecords.map(record => normalizeRecord(record, classifiedEntities, earliestRendererStartTime, mainFrameId));

        const maxExecutionTime = getMaxExecutionTime(normalizedRecords);
        const totalDuration = getTotalDuration(normalizedRecords);
        const totalTransferSize = getTotalTransferSize(normalizedRecords);

        const score = calculateScore(context, totalDuration);

        return {
            score,
            numericValue: totalDuration,
            numericUnit: 'millisecond',
            displayValue: str_(i18n.UIStrings.seconds, { timeInMs: totalDuration }),
            details: createTableDetails(normalizedRecords, earliestRendererStartTime, {
                totalXHRRequests: normalizedRecords.length,
                totalTransferSize: totalTransferSize,
                totalDuration: totalDuration,
                maxExecutionTime: maxExecutionTime
            }),
        };
    }
}

async function getMainFrameId(artifacts, context) {
    if (artifacts.GatherContext.gatherMode === 'navigation') {
        const mainResource = await MainResource.request({ devtoolsLog: artifacts.devtoolsLogs[Audit.DEFAULT_PASS], URL: artifacts.URL }, context);
        return mainResource.frameId;
    }
    return undefined;
}

function getEarliestRendererStartTime(records) {
    return records.reduce((min, record) => Math.min(min, record.rendererStartTime), Infinity);
}

function normalizeRecord(record, classifiedEntities, earliestRendererStartTime, mainFrameId) {
    const entity = classifiedEntities.entityByUrl.get(record.url);
    const normalizedTime = time => time < earliestRendererStartTime || !Number.isFinite(time) ? undefined : (time - earliestRendererStartTime);
    const duration = normalizedTime(record.networkEndTime) - normalizedTime(record.networkRequestTime);

    return {
        url: UrlUtils.elideDataURI(record.url),
        rendererStartTime: normalizedTime(record.rendererStartTime),
        networkRequestTime: normalizedTime(record.networkRequestTime),
        networkEndTime: normalizedTime(record.networkEndTime),
        duration: duration,
        transferSize: record.transferSize,
        resourceSize: record.resourceSize,
        statusCode: record.statusCode,
        mimeType: record.mimeType,
        requestMethod: record.requestMethod || 'GET',
        resourceType: record.resourceType,
        isLinkPreload: record.isLinkPreload || undefined,
        experimentalFromMainFrame: mainFrameId ? ((record.frameId === mainFrameId) || undefined) : undefined,
        entity: entity?.name,
    };
}

function getMaxExecutionTime(records) {
    return Math.max(...records.map(record => record.networkEndTime || 0));
}

function getTotalDuration(records) {
    return records.reduce((sum, record) => sum + (record.duration || 0), 0);
}

function getTotalTransferSize(records) {
    return records.reduce((sum, record) => sum + (record.transferSize || 0), 0);
}

function calculateScore(context, time) {
    return Audit.computeLogNormalScore({
        p10: context.options.p10,
        median: context.options.median,
    }, time);
}

function createTableDetails(records, earliestRendererStartTime, summary) {
    const headings = [
        { key: 'url', valueType: 'url', label: 'URL' },
        { key: 'requestMethod', valueType: 'text', label: 'Method' },
        { key: 'networkRequestTime', valueType: 'ms', granularity: 1, label: 'Request Time' },
        { key: 'networkEndTime', valueType: 'ms', granularity: 1, label: 'End Time' },
        { key: 'duration', valueType: 'ms', granularity: 1, label: 'Duration' },
        { key: 'transferSize', valueType: 'bytes', displayUnit: 'kb', granularity: 1, label: 'Transfer Size' },
        { key: 'statusCode', valueType: 'text', label: 'Status' },
        { key: 'mimeType', valueType: 'text', label: 'Type' },
        { key: 'resourceType', valueType: 'text', label: 'Resource Type' },
    ];

    const items = records.map(record => ({
        ...record,
        networkRequestTime: record.networkRequestTime ? Math.round(record.networkRequestTime) : undefined,
        networkEndTime: record.networkEndTime ? Math.round(record.networkEndTime) : undefined,
        duration: record.duration ? Math.round(record.duration) : undefined,
    }));

    // Sort by duration (longest first)
    items.sort((a, b) => (b.duration || 0) - (a.duration || 0));

    return Audit.makeTableDetails(headings, items, {
        networkStartTimeTs: Number.isFinite(earliestRendererStartTime) ? earliestRendererStartTime * 1000 : undefined,
        summary: {
            wastedMs: summary.totalXHRRequests > 0 ? Math.round(summary.totalDuration) : 0,
        }
    });
}

export default NetworkXHRAudit;
