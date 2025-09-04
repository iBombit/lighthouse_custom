import { Audit } from 'lighthouse/core/audits/audit.js';
import { NetworkRecords } from 'lighthouse/core/computed/network-records.js';
import * as i18n from 'lighthouse/core/lib/i18n/i18n.js';

const UIStrings = {
    title: 'XHR Request Count',
    failureTitle: 'Too many XHR requests',
    description: 'Counts the number of XHR/AJAX requests made during page load. Too many XHR requests can impact performance and user experience.',
    displayValue: `{itemCount, plural,
        =1 {1 XHR request}
        other {# XHR requests}
    }`,
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class XHRCountAudit extends Audit {
    static get meta() {
        return {
            id: 'xhr-count-audit',
            scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
            title: str_(UIStrings.title),
            failureTitle: str_(UIStrings.failureTitle),
            description: str_(UIStrings.description),
            requiredArtifacts: ['devtoolsLogs'],
        };
    }

    static get defaultOptions() {
        return {
            // Scoring thresholds for XHR count
            // Good: <= 5 requests, Average: 6-15 requests, Poor: > 15 requests
            p10: 5,
            median: 15,
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

        // Filter only XHR requests
        const xhrRecords = records.filter(record => XHRCountAudit.isXHRRequest(record));
        const xhrCount = xhrRecords.length;

        // Create breakdown by request method
        const methodBreakdown = {};
        const statusBreakdown = {};
        const domainBreakdown = {};

        xhrRecords.forEach(record => {
            // Method breakdown
            const method = record.requestMethod || 'GET';
            methodBreakdown[method] = (methodBreakdown[method] || 0) + 1;

            // Status code breakdown
            const status = record.statusCode || 'Unknown';
            const statusGroup = Math.floor(status / 100) * 100; // Group by 2xx, 3xx, 4xx, 5xx
            statusBreakdown[`${statusGroup}xx`] = (statusBreakdown[`${statusGroup}xx`] || 0) + 1;

            // Domain breakdown
            try {
                const domain = new URL(record.url).hostname;
                domainBreakdown[domain] = (domainBreakdown[domain] || 0) + 1;
            } catch (e) {
                domainBreakdown['Unknown'] = (domainBreakdown['Unknown'] || 0) + 1;
            }
        });

        // Calculate score based on XHR count
        // Lower count = better score
        const score = XHRCountAudit.calculateScore(context.options, xhrCount);

        // Create table details for breakdown
        const breakdownItems = [
            ...Object.entries(methodBreakdown).map(([method, count]) => ({
                category: 'HTTP Method',
                name: method,
                count: count,
                percentage: Math.round((count / xhrCount) * 100)
            })),
            ...Object.entries(statusBreakdown).map(([status, count]) => ({
                category: 'Status Code',
                name: status,
                count: count,
                percentage: Math.round((count / xhrCount) * 100)
            })),
            ...Object.entries(domainBreakdown).map(([domain, count]) => ({
                category: 'Domain',
                name: domain,
                count: count,
                percentage: Math.round((count / xhrCount) * 100)
            }))
        ];

        const headings = [
            { key: 'category', itemType: 'text', text: 'Category' },
            { key: 'name', itemType: 'text', text: 'Name' },
            { key: 'count', itemType: 'numeric', text: 'Count' },
            { key: 'percentage', itemType: 'numeric', text: 'Percentage' },
        ];

        const tableDetails = Audit.makeTableDetails(headings, breakdownItems);

        return {
            score,
            numericValue: xhrCount,
            numericUnit: 'unitless',
            displayValue: str_(UIStrings.displayValue, { itemCount: xhrCount }),
            details: tableDetails,
            metricSavings: {
                XHR: xhrCount
            }
        };
    }

    static calculateScore(options, xhrCount) {
        // Inverse log-normal scoring - fewer requests = better score
        if (xhrCount <= options.p10) {
            return 1; // Perfect score for low XHR count
        }
        
        // Use inverse scoring where higher count = lower score
        const score = Audit.computeLogNormalScore(
            {
                p10: options.p10,
                median: options.median,
            },
            xhrCount
        );
        
        return Math.max(0, Math.min(1, score));
    }
}

export default XHRCountAudit;
