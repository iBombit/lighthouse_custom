import { Audit } from 'lighthouse/core/audits/audit.js';
import NetworkRequests from './network-requests.js';

class SlowestNetworkRequest extends NetworkRequests {
    static get meta() {
        return {
            id: 'slowest-network-request',
            scoreDisplayMode: NetworkRequests.meta.scoreDisplayMode,
            title: 'Slowest Network Request',
            description: 'Identifies the slowest network request during page load.',
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

        // Find the slowest request by duration
        const slowestRequest = parentAuditResult.details.items.reduce((max, item) => item.duration > max.duration ? item : max, parentAuditResult.details.items[0]);

        // Calculate the score based on the duration of the slowest network request
        const maxDuration = slowestRequest.duration;
        const score = Audit.computeLogNormalScore({
            p10: context.options.p10,
            median: context.options.median,
        }, maxDuration);

        return {
            score,
            numericValue: maxDuration,
            numericUnit: 'millisecond',
            displayValue: `Slowest request took ${maxDuration} ms`,
            details: Audit.makeTableDetails(parentAuditResult.details.headings, [slowestRequest]),
        };
    }
}

export default SlowestNetworkRequest;