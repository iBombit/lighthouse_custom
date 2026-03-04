import { Audit } from 'lighthouse/core/audits/audit.js';
import UrlUtils from 'lighthouse/core/lib/url-utils.js';
import { NetworkRecords } from 'lighthouse/core/computed/network-records.js';
import { EntityClassification } from 'lighthouse/core/computed/entity-classification.js';
import { ProcessedTrace } from 'lighthouse/core/computed/processed-trace.js';
import { ProcessedNavigation } from 'lighthouse/core/computed/processed-navigation.js';
import * as i18n from 'lighthouse/core/lib/i18n/i18n.js';
import { buildWaterfallSVG } from 'lh-pptr-framework/reporting/waterfall.js';

const UIStrings = {
    title: 'Network Waterfall',
    description: 'Visual waterfall chart of all network requests during page load, ' +
                 'grouped by entity and annotated with key timing markers (FCP, LCP, DCL, Load).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class NetworkWaterfall extends Audit {
    static get meta() {
        return {
            id: 'network-waterfall',
            scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
            title: str_(UIStrings.title),
            description: str_(UIStrings.description),
            requiredArtifacts: ['DevtoolsLog', 'URL', 'GatherContext', 'Trace'],
        };
    }

    static async audit(artifacts, context) {
        const devtoolsLog = artifacts.DevtoolsLog;
        const records = await NetworkRecords.request(devtoolsLog, context);
        const classifiedEntities = await EntityClassification.request(
            { URL: artifacts.URL, devtoolsLog }, context,
        );

        // ── Normalize times relative to earliest renderer start ────────
        const earliestStart = records.reduce(
            (min, r) => Math.min(min, r.rendererStartTime), Infinity,
        );

        const norm = (t) =>
            (!Number.isFinite(t) || t < earliestStart) ? undefined : (t - earliestStart);

        // ── Build per-entity request lists ─────────────────────────────
        const entityMap = new Map();

        for (const record of records) {
            const entity   = classifiedEntities.entityByUrl.get(record.url);
            const name     = entity?.name || 'Unknown';
            const start    = norm(record.networkRequestTime);
            const end      = norm(record.networkEndTime);
            const duration = (start != null && end != null) ? (end - start) : 0;

            if (!entityMap.has(name)) entityMap.set(name, []);
            entityMap.get(name).push({
                url:          UrlUtils.elideDataURI(record.url),
                start:        start ?? 0,
                duration:     Math.max(duration, 0),
                transferSize: record.transferSize ?? 0,
                resourceSize: record.resourceSize ?? 0,
                statusCode:   record.statusCode,
                mimeType:     record.mimeType || '',
                entity:       name,
            });
        }

        if (entityMap.size === 0) {
            return { score: null, notApplicable: true };
        }

        // Sort entities by earliest request start, sub-items by start time
        const sorted = [...entityMap.entries()].sort((a, b) => {
            const aMin = Math.min(...a[1].map(r => r.start));
            const bMin = Math.min(...b[1].map(r => r.start));
            return aMin - bMin;
        });

        const requests     = [];
        const entityGroups = [];

        for (const [name, reqs] of sorted) {
            reqs.sort((a, b) => a.start - b.start);
            entityGroups.push({
                name,
                startIndex:    requests.length,
                count:         reqs.length,
                totalDuration: reqs.reduce((s, r) => s + r.duration, 0),
                totalTransfer: reqs.reduce((s, r) => s + r.transferSize, 0),
            });
            requests.push(...reqs);
        }

        // ── Timing markers (navigation mode only) ─────────────────────
        const timingMarkers = [];
        try {
            const processedTrace = await ProcessedTrace.request(artifacts.Trace, context);
            const nav = await ProcessedNavigation.request(processedTrace, context);
            const t   = nav.timings;

            if (t.firstContentfulPaint)   timingMarkers.push({ t: t.firstContentfulPaint,   label: 'FCP',  color: '#1a73e8' });
            if (t.largestContentfulPaint)  timingMarkers.push({ t: t.largestContentfulPaint,  label: 'LCP',  color: '#0cce6b' });
            if (t.domContentLoaded)        timingMarkers.push({ t: t.domContentLoaded,        label: 'DCL',  color: '#4a90d9' });
            if (t.load)                    timingMarkers.push({ t: t.load,                    label: 'Load', color: '#e86c8d' });
        } catch {
            // timespan mode — no navigation metrics available
        }

        // ── Generate SVG and encode as data URI ───────────────────────
        const svg     = buildWaterfallSVG(requests, entityGroups, timingMarkers, 'Network Waterfall');
        const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

        return {
            score: 1,
            details: Audit.makeTableDetails(
                [{ key: 'waterfall', valueType: 'thumbnail', label: '' }],
                [{ waterfall: dataUri }],
            ),
        };
    }
}

export default NetworkWaterfall;
