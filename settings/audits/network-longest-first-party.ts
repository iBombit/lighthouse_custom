import { Audit } from 'lighthouse/core/audits/audit.js';
import UrlUtils from 'lighthouse/core/lib/url-utils.js';
import { EntityClassification } from 'lighthouse/core/computed/entity-classification.js';
import type * as LH from 'lighthouse/types/lh.js';
import NetworkRequests, { TIMING_BREAKDOWN_HEADINGS, findLongestRequest, withTimingBreakdown } from './network-requests.js';
import type { NetworkRequestsTableItem } from './network-requests.js';
import * as params from '../testParams.js';

class LongestFirstPartyRequest extends NetworkRequests {
    static override get meta(): LH.Audit.Meta {
        return {
            id: 'longest-first-party-request',
            scoreDisplayMode: NetworkRequests.meta.scoreDisplayMode,
            title: 'Longest First-Party Network Request',
            description: 'The longest request to the own servers of the site (same entity as the page), with where its time ' +
                'went: stalled / connection setup, waiting for the server (TTFB) and download. Long TTFB is backend time ' +
                '(slow API / page generation, missing cache); long download means a large response or slow bandwidth.',
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

        // First party = the entity of the step's page (Lighthouse's classification, which also knows that e.g.
        // google.com and gstatic.com belong together); the --url root domain is the fallback.
        const entities = await EntityClassification.request({ URL: artifacts.URL, devtoolsLog: artifacts.DevtoolsLog }, context);
        const firstParty = entities.firstParty?.name;
        const mainDocumentURL = params.url;
        const firstPartyRequests = allRequests.filter(item => {
            if (firstParty) return item.entity === firstParty;
            return mainDocumentURL ? UrlUtils.rootDomainsMatch(item.url, mainDocumentURL) : false;
        });

        if (firstPartyRequests.length === 0) {
            return {
                score: 1,
                notApplicable: true,
                explanation: 'No first-party network requests found.',
            };
        }

        // Find the longest first-party request by duration (requests that never finished have none)
        const longestFirstPartyRequest = findLongestRequest(firstPartyRequests);
        if (!longestFirstPartyRequest) {
            return {
                score: 1,
                notApplicable: true,
                explanation: 'No completed first-party network requests found.',
            };
        }

        // Calculate the score based on the duration of the longest first-party request
        const maxDuration = longestFirstPartyRequest.duration!;
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
            details: Audit.makeTableDetails([...details.headings, ...TIMING_BREAKDOWN_HEADINGS], [await withTimingBreakdown(artifacts, context, longestFirstPartyRequest)]),
        };
    }
}

export default LongestFirstPartyRequest;
