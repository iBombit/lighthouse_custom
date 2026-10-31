import { Audit } from 'lighthouse/core/audits/audit.js';
import type * as LH from 'lighthouse/types/lh.js';
import NetworkRequests, { TIMING_BREAKDOWN_HEADINGS, findLongestRequest, withTimingBreakdown } from './network-requests.js';
import type { NetworkRequestsTableItem } from './network-requests.js';

class SlowestNetworkRequest extends NetworkRequests {
    static override get meta(): LH.Audit.Meta {
        return {
            id: 'slowest-network-request',
            scoreDisplayMode: NetworkRequests.meta.scoreDisplayMode,
            title: 'Slowest Network Request',
            description: 'The longest request of the step (any party), with where its time went: stalled / connection ' +
                'setup, waiting for the server (TTFB) and download. Long TTFB → backend or CDN; long download → size or ' +
                'bandwidth; long stall → too many parallel requests. Requests that are meant to stay open (polling, ' +
                'analytics beacons) can dominate this audit: check them in the Network Waterfall.',
            requiredArtifacts: NetworkRequests.meta.requiredArtifacts,
        };
    }

    static override async audit(artifacts: LH.Artifacts, context: LH.Audit.Context): Promise<LH.Audit.Product> {
        const parentAuditResult = await super.audit(artifacts, context);
        const details = parentAuditResult.details;
        if (!details || details.type !== 'table' || !details.items || details.items.length === 0) {
            return {
                score: 1,
                notApplicable: true,
                explanation: 'No network requests found.',
            };
        }

        // Flatten grouped items → individual requests
        const allRequests = (details.items as NetworkRequestsTableItem[]).flatMap(item =>
            (item.subItems?.items as NetworkRequestsTableItem[] | undefined) ?? [item]
        );

        // Find the slowest request by duration (requests that never finished have none)
        const slowestRequest = findLongestRequest(allRequests);
        if (!slowestRequest) {
            return {
                score: 1,
                notApplicable: true,
                explanation: 'No completed network requests found.',
            };
        }

        // Calculate the score based on the duration of the slowest network request
        const maxDuration = slowestRequest.duration!;
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
            displayValue: `Slowest request took ${displayDuration} ms`,
            details: Audit.makeTableDetails([...details.headings, ...TIMING_BREAKDOWN_HEADINGS], [await withTimingBreakdown(artifacts, context, slowestRequest)]),
        };
    }
}

export default SlowestNetworkRequest;
