import { Audit } from 'lighthouse/core/audits/audit.js';
import NetworkRequests from './network-requests.js';
import UrlUtils from 'lighthouse/core/lib/url-utils.js';
import * as params from '../testParams.js';

class LongestFirstPartyRequest extends NetworkRequests {
    static get meta() {
        return {
            id: 'longest-first-party-request',
            scoreDisplayMode: NetworkRequests.meta.scoreDisplayMode,
            title: 'Longest First-Party Network Request',
            description: 'Identifies the longest first-party network request during page load.',
            requiredArtifacts: NetworkRequests.meta.requiredArtifacts,
        };
    }

    static async audit(artifacts, context) {
        const parentAuditResult = await super.audit(artifacts, context);
        if (!parentAuditResult.details || !parentAuditResult.details.items || parentAuditResult.details.items.length === 0) {
            return {
                score: 1,
                notApplicable: true,
                explanation: 'No network requests found.',
            };
        }

        // Use the main document URL to compare against network request URLs
        const mainDocumentURL = params.url;

        // Filter for first-party requests using UrlUtils.rootDomainsMatch
        const firstPartyRequests = parentAuditResult.details.items.filter(item => {
            return UrlUtils.rootDomainsMatch(item.url, mainDocumentURL);
        });

        if (firstPartyRequests.length === 0) {
            return {
                score: 1,
                notApplicable: true,
                explanation: 'No first-party network requests found.',
            };
        }

        // Find the longest first-party request by duration
        const longestFirstPartyRequest = firstPartyRequests.reduce((max, item) => item.duration > max.duration ? item : max, firstPartyRequests[0]);

        // Calculate the score based on the duration of the longest first-party request
        const maxDuration = longestFirstPartyRequest.duration;
        const score = Audit.computeLogNormalScore({
            p10: context.options.p10,
            median: context.options.median,
        }, maxDuration);

        // Round the duration for display to remove decimal places
        const displayDuration = Math.round(maxDuration);

        return {
            score,
            numericValue: maxDuration,
            numericUnit: 'millisecond',
            displayValue: `Longest first-party request took ${displayDuration} ms`,
            details: Audit.makeTableDetails(parentAuditResult.details.headings, [longestFirstPartyRequest]),
        };
    }
}

export default LongestFirstPartyRequest;