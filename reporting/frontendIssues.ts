/**
 * Turns a Lighthouse flow result into prioritized, de-duplicated issues for frontend developers,
 * and writes them as Markdown (to read or paste into tickets), JSON and a Jira-importable CSV.
 */
import type * as LH from 'lighthouse/types/lh.js';
import { metricsToAudits } from '../settings/audits/metrics-to-audits.js';
import UrlUtils from 'lighthouse/core/lib/url-utils.js';
import { shortScriptName } from '../settings/audits/main-thread-analysis.js';

type AuditResult = LH.Result['audits'][string];

export type IssuePriority = 'P1' | 'P2' | 'P3';
export type IssueOwner = 'frontend' | 'third-party' | 'backend';

export interface IssueOccurrence {
    stepIndex: number;
    step: string;
    pageUrl: string;
    /** Impact in this step, e.g. "412 ms of TBT (63%)". */
    impact: string;
    evidence: string[];
}

export interface FrontendIssue {
    /** Stable id derived from the rule and its target (same problem → same id across runs). */
    id: string;
    key: string;
    title: string;
    priority: IssuePriority;
    owner: IssueOwner;
    category: string;
    metrics: string[];
    /** Largest estimated time impact over all occurrences (ms), for ordering. */
    impactMs: number;
    /** Largest estimated byte savings over all occurrences. */
    impactBytes: number;
    summary: string;
    recommendation: string;
    references: string[];
    labels: string[];
    occurrences: IssueOccurrence[];
}

interface Finding extends Omit<FrontendIssue, 'id' | 'occurrences'> {
    occurrence: IssueOccurrence;
}

// ── Metric rules ───────────────────────────────────────────────────────

interface MetricRule {
    id: string;
    short: string;
    name: string;
    unit: 'ms' | 'unitless';
    related: string[];
    fallbackScoring?: LH.Audit.ScoreOptions;
    advice: string;
    reference: string;
}

export const METRIC_RULES: MetricRule[] = [
    {
        id: 'largest-contentful-paint', short: 'LCP', name: 'Largest Contentful Paint', unit: 'ms', related: metricsToAudits.lcpRelevantAudits,
        advice: 'Find the LCP element ("LCP breakdown" insight) and shorten the phase that dominates: server response (TTFB: caching, CDN, ' +
            'backend time), resource load delay (make the LCP image discoverable in the HTML, `fetchpriority="high"`, never lazy-load it), ' +
            'resource load time (smaller, modern-format images) and render delay (remove render-blocking CSS/JS, avoid client-side-only rendering of the hero).',
        reference: 'https://web.dev/articles/optimize-lcp',
    },
    {
        id: 'total-blocking-time', short: 'TBT', name: 'Total Blocking Time', unit: 'ms', related: metricsToAudits.tbtRelevantAudits,
        advice: 'Break up long main-thread tasks (yield with `await scheduler.yield()` or `setTimeout`), defer JavaScript that is not needed ' +
            'for the first render, split bundles, move heavy work to Web Workers and limit third-party scripts. The "Total Blocking Time ' +
            'breakdown" audit lists the exact long tasks and scripts.',
        reference: 'https://web.dev/articles/optimize-long-tasks',
    },
    {
        id: 'cumulative-layout-shift', short: 'CLS', name: 'Cumulative Layout Shift', unit: 'unitless', related: metricsToAudits.clsRelevantAudits,
        advice: 'Reserve space for images, ads, embeds and late content (`width`/`height` or `aspect-ratio`), do not insert content above ' +
            'existing content, and avoid font swaps that change text size. The "Layout shift culprits" insight shows the shifting elements.',
        reference: 'https://web.dev/articles/optimize-cls',
    },
    {
        id: 'first-contentful-paint', short: 'FCP', name: 'First Contentful Paint', unit: 'ms', related: metricsToAudits.fcpRelevantAudits,
        advice: 'Reduce server response time and redirects, remove or defer render-blocking CSS and JavaScript, inline critical CSS and ' +
            'preconnect to required origins.',
        reference: 'https://web.dev/articles/fcp',
    },
    {
        id: 'speed-index', short: 'SI', name: 'Speed Index', unit: 'ms', related: metricsToAudits.fcpRelevantAudits,
        advice: 'Render meaningful content earlier: fix render-blocking resources and reduce main-thread work during load.',
        reference: 'https://developer.chrome.com/docs/lighthouse/performance/speed-index',
    },
    {
        id: 'interaction-to-next-paint', short: 'INP', name: 'Interaction to Next Paint', unit: 'ms', related: metricsToAudits.inpRelevantAudits,
        fallbackScoring: { p10: 200, median: 500 },
        advice: 'Shorten the three INP phases: input delay (long tasks running when the user interacts), processing time (event handlers: ' +
            'do the minimum, then yield) and presentation delay (smaller DOM, cheaper style/layout). See the "INP breakdown" insight.',
        reference: 'https://web.dev/articles/optimize-inp',
    },
];

const METRIC_SHORT: Record<string, string> = { LCP: 'LCP', FCP: 'FCP', TBT: 'TBT', CLS: 'CLS', INP: 'INP' };
const MS_METRICS = ['LCP', 'FCP', 'TBT', 'INP'];

/** Status of a metric score the way the report colors it. */
export function scoreStatus(score: number | null): 'good' | 'average' | 'poor' {
    if (score === null || score >= 0.9) return 'good';
    return score >= 0.5 ? 'average' : 'poor';
}

/** Scoring thresholds of a metric audit (p10 = good, median = poor boundary). */
export function metricScoring(audit: AuditResult, rule: MetricRule): LH.Audit.ScoreOptions | undefined {
    const options = (audit as { scoringOptions?: LH.Audit.ScoreOptions }).scoringOptions;
    return options ?? rule.fallbackScoring;
}

export function formatMetric(value: number, unit: 'ms' | 'unitless'): string {
    if (unit === 'unitless') return value.toFixed(value < 1 ? 3 : 2);
    return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`;
}

// ── Helpers for reading audit details ─────────────────────────────────

type Item = Record<string, unknown>;

/** Table-like rows of an audit's details (tables, opportunities and the tables inside lists). */
export function detailItems(details: unknown): Item[] {
    if (!details || typeof details !== 'object') return [];
    const d = details as { type?: string; items?: unknown[]; value?: unknown };
    if (d.type === 'list-section') return detailItems(d.value);
    if (d.type === 'list' && Array.isArray(d.items)) return d.items.flatMap(detailItems);
    if ((d.type === 'table' || d.type === 'opportunity') && Array.isArray(d.items)) return d.items as Item[];
    return [];
}

/** The table inside a `list` section with the given title. */
function listSection(details: unknown, title: string): Item[] {
    const d = details as { type?: string; items?: Array<{ type?: string; title?: unknown; value?: unknown }> } | undefined;
    const section = d?.type === 'list' ? d.items?.find(i => i.type === 'list-section' && i.title === title) : undefined;
    return section ? detailItems(section.value) : [];
}

function itemLabel(item: Item): string | undefined {
    for (const key of ['url', 'source', 'node', 'label', 'entity', 'request', 'origin', 'name', 'element', 'animation', 'statistic']) {
        const v = item[key];
        if (typeof v === 'string' && v) return v;
        if (v && typeof v === 'object') {
            const o = v as Record<string, unknown>;
            for (const k of ['url', 'snippet', 'selector', 'nodeLabel', 'text', 'value']) if (typeof o[k] === 'string' && o[k]) return o[k] as string;
        }
    }
    return undefined;
}

function fmtBytes(bytes: number): string {
    return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MiB` : `${Math.round(bytes / 1024)} KiB`;
}

function itemValue(item: Item): string | undefined {
    const num = (k: string) => (typeof item[k] === 'number' ? item[k] as number : undefined);
    const wastedMs = num('wastedMs'), wastedBytes = num('wastedBytes'), totalBytes = num('totalBytes');
    const parts: string[] = [];
    if (wastedMs !== undefined && wastedMs > 0) parts.push(`${Math.round(wastedMs)} ms`);
    if (wastedBytes !== undefined && wastedBytes > 0) parts.push(`${fmtBytes(wastedBytes)} savings`);
    else if (totalBytes !== undefined && totalBytes > 0) parts.push(fmtBytes(totalBytes));
    for (const k of ['blockingTime', 'duration', 'mainThreadTime', 'total', 'score']) {
        const v = num(k);
        if (!parts.length && v !== undefined && v > 0) parts.push(k === 'score' ? v.toFixed(3) : `${Math.round(v)} ms ${k === 'blockingTime' ? 'blocking' : ''}`.trim());
    }
    return parts.length ? parts.join(', ') : undefined;
}

/** Up to `max` "label — value" evidence lines from an audit's details. */
export function topItems(audit: AuditResult, max = 5): string[] {
    const lines: string[] = [];
    for (const item of detailItems(audit.details)) {
        const label = itemLabel(item);
        if (!label) continue;
        const value = itemValue(item);
        lines.push(value ? `${label} — ${value}` : label);
        if (lines.length >= max) break;
    }
    return lines;
}

/** Markdown link targets in a Lighthouse description. */
function linksOf(markdown: string): string[] {
    return [...markdown.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map(m => m[1]);
}

const AUDIT_CATEGORY: Array<[RegExp, string]> = [
    [/image|unsized|offscreen/, 'Images'],
    [/font/, 'Fonts'],
    [/css/, 'CSS'],
    [/javascript|bootup|mainthread|long-tasks|third-part|duplicated|legacy/, 'JavaScript'],
    [/cls|layout|dom-size|viewport|reflow|animation/, 'Rendering'],
    [/render-blocking|network|document-latency|cache|http|lcp|server|redirect|preconnect/, 'Loading'],
];

function categoryOf(id: string): string {
    return AUDIT_CATEGORY.find(([re]) => re.test(id))?.[1] ?? 'Performance';
}

function ownerOf(id: string): IssueOwner {
    if (id === 'third-parties-insight') return 'third-party';
    if (id === 'server-response-time' || id === 'document-latency-insight') return 'backend';
    return 'frontend';
}

/** Which metrics an audit affects: from its metric savings, else from the metric → audit mapping. */
function metricsOf(id: string, audit: AuditResult): string[] {
    const savings = (audit as { metricSavings?: Record<string, number | undefined> }).metricSavings ?? {};
    const fromSavings = Object.entries(savings).filter(([, v]) => (v ?? 0) > 0).map(([k]) => METRIC_SHORT[k] ?? k);
    if (fromSavings.length) return fromSavings;
    return METRIC_RULES.filter(r => r.related.includes(id)).map(r => r.short);
}

const priorityRank: Record<IssuePriority, number> = { P1: 0, P2: 1, P3: 2 };

function fnv1a(text: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36).toUpperCase().padStart(7, '0').slice(-6);
}

// ── Rules ──────────────────────────────────────────────────────────────

function metricFindings(lhr: LH.Result, occurrenceBase: Omit<IssueOccurrence, 'impact' | 'evidence'>): Finding[] {
    const findings: Finding[] = [];
    for (const rule of METRIC_RULES) {
        const audit = lhr.audits[rule.id];
        if (!audit || audit.numericValue === undefined || typeof audit.score !== 'number' || audit.score >= 0.9) continue;
        const scoring = metricScoring(audit, rule);
        const value = audit.numericValue;
        const status = scoreStatus(audit.score);
        const related = rule.related
            .map(id => lhr.audits[id])
            .filter((a): a is AuditResult => !!a && typeof a.score === 'number' && a.score < 0.9 && !['notApplicable', 'informative', 'manual'].includes(a.scoreDisplayMode))
            .map(a => `${a.title}${a.displayValue ? ` (${a.displayValue})` : ''}`);
        findings.push({
            key: `metric:${rule.short}`,
            title: `Improve ${rule.name} (${rule.short})`,
            priority: status === 'poor' ? 'P1' : 'P2',
            owner: 'frontend',
            category: 'Web Vitals',
            metrics: [rule.short],
            impactMs: rule.unit === 'ms' && scoring ? Math.max(value - scoring.p10, 0) : 0,
            impactBytes: 0,
            summary: `${rule.name} is ${status === 'poor' ? 'poor' : 'below target'}${scoring ? ` (target ≤ ${formatMetric(scoring.p10, rule.unit)})` : ''}.`,
            recommendation: rule.advice,
            references: [rule.reference],
            labels: ['performance', 'web-vitals', rule.short.toLowerCase()],
            occurrence: {
                ...occurrenceBase,
                impact: `${rule.short} ${formatMetric(value, rule.unit)}${scoring ? ` (good ≤ ${formatMetric(scoring.p10, rule.unit)}, poor > ${formatMetric(scoring.median, rule.unit)})` : ''}`,
                evidence: [
                    `${rule.short} = ${formatMetric(value, rule.unit)}, score ${Math.round(audit.score * 100)}/100`,
                    ...(related.length ? [`Related failing audits: ${related.slice(0, 6).join('; ')}`] : []),
                ],
            },
        });
    }
    return findings;
}

function tbtScriptFindings(lhr: LH.Result, occurrenceBase: Omit<IssueOccurrence, 'impact' | 'evidence'>): Finding[] {
    const breakdown = lhr.audits['tbt-breakdown'];
    if (!breakdown?.details) return [];
    const stepTbt = lhr.audits['total-blocking-time']?.numericValue ?? 0;
    const tbtStatus = scoreStatus(lhr.audits['total-blocking-time']?.score ?? null);
    const hotspots = listSection(lhr.audits['js-hotspots']?.details, 'Functions');
    const findings: Finding[] = [];
    for (const row of listSection(breakdown.details, 'TBT contribution by script')) {
        const url = String(row.url ?? '');
        const tbtImpact = Number(row.tbtImpact ?? 0);
        if (!url || tbtImpact < 50) continue;
        const party = String(row.party ?? '');
        const entity = String(row.entity ?? '');
        const isThird = party.startsWith('3rd');
        const isUrl = /^[a-z][a-z0-9+.-]*:\/\//i.test(url);
        const name = isUrl ? shortScriptName(url) : url;
        const share = stepTbt > 0 ? Math.round((tbtImpact / stepTbt) * 100) : 0;
        const functions = hotspots
            .filter(h => h.url === url && Number(h.selfInLongTasks ?? 0) >= 1)
            .slice(0, 3)
            .map(h => `${h.functionName} (line ${h.position}) — ${Math.round(Number(h.selfInLongTasks))} ms self time in long tasks`);
        findings.push({
            key: `tbt-script:${url}`,
            title: !isUrl ? `Reduce main-thread work not attributed to a script (${url})`
                : isThird ? `Reduce main-thread blocking by third-party ${entity} (${name})`
                : `Reduce main-thread blocking by ${name}`,
            priority: tbtImpact >= 250 || (tbtStatus === 'poor' && share >= 50) ? 'P1' : tbtImpact >= 100 || tbtStatus !== 'good' ? 'P2' : 'P3',
            owner: isThird ? 'third-party' : 'frontend',
            category: 'Main thread',
            metrics: ['TBT', 'INP'],
            impactMs: tbtImpact,
            impactBytes: 0,
            summary: `${isThird ? `Third-party script from ${entity}` : 'This script'} runs long main-thread tasks that block user input (Total Blocking Time).`,
            recommendation: isThird
                ? `Load ${entity} with \`async\`/\`defer\` or after the first user interaction, use a facade for embeds, ask the vendor for a lighter ` +
                  'integration, or remove it if its value does not justify the blocking time. Verify the impact by blocking the URL in DevTools ' +
                  '(Network → Block request URL) and re-running the test.'
                : 'Split the long tasks in this script into chunks under 50 ms (yield with `await scheduler.yield()` or `setTimeout`), defer work ' +
                  'not needed for the first render, lazy-load code with dynamic `import()`, move heavy computation to a Web Worker and remove ' +
                  'unused or legacy JavaScript. Open the step\'s trace in the DevTools Performance panel (Bottom-Up, group by URL) or run with ' +
                  '`--jsProfiling=true` to see the slowest functions.',
            references: [
                'https://web.dev/articles/optimize-long-tasks',
                isThird ? 'https://web.dev/articles/optimizing-content-efficiency-loading-third-party-javascript' : 'https://developer.chrome.com/docs/devtools/performance/reference#bottom-up',
            ],
            labels: ['performance', 'tbt', 'main-thread', ...(isThird ? ['third-party'] : ['javascript'])],
            occurrence: {
                ...occurrenceBase,
                impact: `${Math.round(tbtImpact)} ms of TBT${share ? ` (${share}% of ${Math.round(stepTbt)} ms)` : ''}`,
                evidence: [
                    `${Math.round(tbtImpact)} ms of TBT from ${Number(row.longTasks ?? 0)} long task(s); ${Math.round(Number(row.blockingTime ?? 0))} ms blocking and ` +
                    `${Math.round(Number(row.selfTime ?? 0))} ms main-thread time in the whole step`,
                    `Script: ${url}`,
                    ...functions.map(fn => `Hot function: ${fn}`),
                ],
            },
        });
    }
    return findings;
}

function lighthouseAuditFindings(lhr: LH.Result, occurrenceBase: Omit<IssueOccurrence, 'impact' | 'evidence'>): Finding[] {
    const findings: Finding[] = [];
    for (const ref of lhr.categories?.performance?.auditRefs ?? []) {
        if (ref.group !== 'insights' && ref.group !== 'diagnostics') continue;
        const audit = lhr.audits[ref.id];
        if (!audit || typeof audit.score !== 'number' || audit.score >= 0.9) continue;
        if (['notApplicable', 'informative', 'manual', 'error'].includes(audit.scoreDisplayMode)) continue;
        const savings = (audit as { metricSavings?: Record<string, number | undefined> }).metricSavings ?? {};
        const details = audit.details as { overallSavingsMs?: number; overallSavingsBytes?: number } | undefined;
        const savingsMs = Math.max(0, ...MS_METRICS.map(m => savings[m] ?? 0), details?.overallSavingsMs ?? 0,
            audit.numericUnit === 'millisecond' && ref.group === 'insights' ? audit.numericValue ?? 0 : 0);
        const savingsBytes = Math.max(details?.overallSavingsBytes ?? 0, audit.numericUnit === 'byte' ? audit.numericValue ?? 0 : 0);
        const clsSavings = savings.CLS ?? 0;
        const metrics = metricsOf(ref.id, audit);
        const priority: IssuePriority = savingsMs >= 500 || clsSavings >= 0.1 ? 'P1'
            : savingsMs >= 150 || savingsBytes >= 100 * 1024 || clsSavings >= 0.05 || audit.score < 0.5 ? 'P2' : 'P3';
        const impactParts = [
            savingsMs > 0 ? `~${Math.round(savingsMs)} ms` : '',
            savingsBytes > 0 ? `~${fmtBytes(savingsBytes)}` : '',
            clsSavings > 0 ? `CLS −${clsSavings.toFixed(3)}` : '',
        ].filter(Boolean);
        findings.push({
            key: `lighthouse:${ref.id}`,
            title: audit.title,
            priority,
            owner: ownerOf(ref.id),
            category: categoryOf(ref.id),
            metrics,
            impactMs: savingsMs,
            impactBytes: savingsBytes,
            summary: audit.displayValue ? `${audit.title}: ${audit.displayValue}.` : `${audit.title}.`,
            recommendation: audit.description,
            references: linksOf(audit.description),
            labels: ['performance', 'lighthouse', ...metrics.map(m => m.toLowerCase())],
            occurrence: {
                ...occurrenceBase,
                impact: impactParts.length ? `Est. savings ${impactParts.join(', ')}`
                    : (audit.displayValue || `Flagged by Lighthouse (score ${Math.round(audit.score * 100)}/100, no time estimate)`),
                evidence: [
                    ...(audit.displayValue ? [audit.displayValue] : []),
                    ...topItems(audit),
                ],
            },
        });
    }
    return findings;
}

function networkFindings(lhr: LH.Result, occurrenceBase: Omit<IssueOccurrence, 'impact' | 'evidence'>): Finding[] {
    const findings: Finding[] = [];
    const longest = lhr.audits['longest-first-party-request'];
    const item = detailItems(longest?.details)[0];
    const duration = longest?.numericValue ?? 0;
    if (item && duration >= 1000) {
        const url = String(item.url ?? '');
        let path = url;
        try { const u = new URL(url); path = u.origin + u.pathname; } catch { /* keep as is */ }
        // Mostly download: the response is too big (an asset or payload to trim) → frontend; otherwise backend.
        const downloadBound = typeof item.downloadTime === 'number' && typeof item.serverTime === 'number' && item.downloadTime > item.serverTime;
        findings.push({
            key: `slow-request:${path}`,
            title: `Slow first-party request: ${shortScriptName(path)}`,
            priority: duration >= 3000 ? 'P2' : 'P3',
            owner: downloadBound ? 'frontend' : 'backend',
            category: 'Network',
            metrics: [],
            impactMs: duration,
            impactBytes: 0,
            summary: 'A first-party request took over a second; if the page waits for it, content and interactivity are delayed.',
            recommendation: downloadBound
                ? 'Most of the time is the download: make the response smaller (code-split / minify / compress JavaScript and CSS, ' +
                  'serve images in modern formats and the right size, paginate API payloads) and make sure it is cached. See the ' +
                  '"Network Waterfall" audit for when it starts and what waits for it.'
                : 'Most of the time is the server: check the backend processing of this endpoint (database, downstream calls, caching), ' +
                  'and whether the frontend can request it earlier, in parallel, or cache the response. See the "Network Waterfall" ' +
                  'audit for when it starts and what waits for it.',
            references: ['https://web.dev/articles/ttfb'],
            labels: ['performance', 'network', 'backend'],
            occurrence: {
                ...occurrenceBase,
                impact: `${Math.round(duration)} ms`,
                evidence: [`${url} took ${Math.round(duration)} ms`, ...breakdownEvidence(item)],
            },
        });
    }
    return findings;
}

/** "Server (TTFB) 812 ms · download 40 ms · …" from the timing-breakdown columns of a request row. */
function breakdownEvidence(item: Item): string[] {
    const ms = (key: string) => (typeof item[key] === 'number' ? `${Math.round(item[key] as number)} ms` : undefined);
    const parts = [
        ms('serverTime') ? `server (TTFB) ${ms('serverTime')}` : '',
        ms('downloadTime') ? `download ${ms('downloadTime')}` : '',
        ms('setupTime') ? `stalled + connect ${ms('setupTime')}` : '',
    ].filter(Boolean);
    return [
        ...(parts.length ? [`Time split: ${parts.join(' · ')}`] : []),
        ...(typeof item.diagnosis === 'string' && item.diagnosis ? [`Diagnosis: ${item.diagnosis}`] : []),
    ];
}

/** API path without the query string, e.g. `https://api.x.com/v1/items`. */
function apiPath(url: string): string {
    try {
        const u = new URL(url);
        return u.origin + u.pathname;
    } catch {
        return url;
    }
}

/** Whether a URL belongs to another site than the step's page (root-domain comparison). */
function isThirdPartyUrl(url: string, pageUrl: string): boolean {
    try {
        return UrlUtils.getRootDomain(url) !== UrlUtils.getRootDomain(pageUrl);
    } catch {
        return false;
    }
}

const VENDOR_ADVICE = 'This is a third-party service: check how its tag / SDK is configured and loaded (initialized twice, ' +
    'consent or ad-blocking in the test environment, wrong account settings), ask the vendor, or remove it if it is not needed.';

/** Failing, slow (backend) and repeated API calls of a step; calls to other sites go to "third-party" at P3. */
function apiFindings(lhr: LH.Result, occurrenceBase: Omit<IssueOccurrence, 'impact' | 'evidence'>): Finding[] {
    const findings: Finding[] = [];
    for (const item of detailItems(lhr.audits['network-xhr-audit']?.details)) {
        const url = String(item.url ?? '');
        const method = String(item.requestMethod ?? 'GET');
        const status = typeof item.statusCode === 'number' ? item.statusCode : 0;
        const path = apiPath(url);
        const thirdParty = isThirdPartyUrl(url, lhr.finalDisplayedUrl);
        if (status >= 400 || status <= 0) {
            findings.push({
                key: `api-failed:${method} ${path}`,
                title: `Failing ${thirdParty ? 'third-party' : 'API'} call: ${method} ${shortScriptName(path)} (${status > 0 ? status : 'no response'})`,
                priority: thirdParty ? 'P3' : 'P2',
                owner: thirdParty ? 'third-party' : status >= 400 && status < 500 ? 'frontend' : 'backend',
                category: 'Network',
                metrics: [],
                impactMs: typeof item.duration === 'number' ? item.duration : 0,
                impactBytes: 0,
                summary: 'An API call of this step failed. Failed calls waste time, often trigger retries and can leave the page without data.',
                recommendation: thirdParty ? VENDOR_ADVICE : status >= 400 && status < 500
                    ? 'A 4xx usually means the frontend sends a wrong / unauthorized request or calls an endpoint that no longer exists: fix the request or remove the call.'
                    : 'A 5xx / network error is a backend or infrastructure failure: check the server logs for this endpoint around the test time.',
                references: ['https://developer.mozilla.org/docs/Web/HTTP/Status'],
                labels: ['performance', 'network', 'api'],
                occurrence: { ...occurrenceBase, impact: `status ${status > 0 ? status : 'failed'}`, evidence: [`${method} ${url}`] },
            });
            continue;
        }
        const serverTime = typeof item.serverTime === 'number' ? item.serverTime : 0;
        if (serverTime >= 1000) {
            findings.push({
                key: `slow-request:${path}`,
                title: `Slow ${thirdParty ? 'third-party' : 'API'} endpoint: ${method} ${shortScriptName(path)}`,
                priority: serverTime >= 3000 && !thirdParty ? 'P2' : 'P3',
                owner: thirdParty ? 'third-party' : 'backend',
                category: 'Network',
                metrics: [],
                impactMs: serverTime,
                impactBytes: 0,
                summary: 'The server took over a second to start answering this API call (time to first byte).',
                recommendation: thirdParty ? VENDOR_ADVICE : 'Profile the endpoint on the server (database queries, downstream calls, missing caches); the request body is in ' +
                    'the "XHR requests" audit to reproduce it. If the page waits for it, consider requesting it earlier or caching the response.',
                references: ['https://web.dev/articles/ttfb'],
                labels: ['performance', 'network', 'api', 'backend'],
                occurrence: {
                    ...occurrenceBase,
                    impact: `${Math.round(serverTime)} ms server time`,
                    evidence: [`${method} ${url}`, ...breakdownEvidence(item)],
                },
            });
        }
    }
    for (const item of detailItems(lhr.audits['xhr-count-audit']?.details)) {
        if (item.category !== 'Repeated call' || typeof item.count !== 'number' || item.count < 2) continue;
        const call = String(item.name ?? '');
        const [method, ...rest] = call.split(' ');
        const path = apiPath(rest.join(' '));
        const thirdParty = isThirdPartyUrl(rest.join(' '), lhr.finalDisplayedUrl);
        findings.push({
            key: `api-repeated:${method} ${path}`,
            title: `Repeated ${thirdParty ? 'third-party' : 'API'} call: ${method} ${shortScriptName(path)} ×${item.count}`,
            priority: item.count >= 4 && !thirdParty ? 'P2' : 'P3',
            owner: thirdParty ? 'third-party' : 'frontend',
            category: 'Network',
            metrics: [],
            impactMs: 0,
            impactBytes: 0,
            summary: 'The same API call (method + URL) was made several times in one step.',
            recommendation: thirdParty ? VENDOR_ADVICE : 'De-duplicate the call: share one request between the components that need the data (a data-fetching cache / ' +
                'store), or cache the response. Repeated calls cost network, server time and main-thread work.',
            references: ['https://web.dev/articles/http-cache'],
            labels: ['performance', 'network', 'api'],
            occurrence: { ...occurrenceBase, impact: `${item.count} identical calls`, evidence: [call] },
        });
    }
    return findings;
}

/** Memory values of a step from the `memory-audit` rows (`raw` by row id). */
function memoryOf(lhr: LH.Result): Record<string, number> | undefined {
    const items = detailItems(lhr.audits['memory-audit']?.details);
    if (!items.length) return undefined;
    const values: Record<string, number> = {};
    for (const item of items) if (typeof item.id === 'string' && typeof item.raw === 'number') values[item.id] = item.raw;
    return typeof values.jsHeapUsed === 'number' ? values : undefined;
}

const MB = 1024 * 1024;

/**
 * Memory that keeps growing while the user interacts with the same page (≥ 3 measurements on it,
 * e.g. a navigation followed by two interactions): a likely leak. Absolute sizes aren't judged: they
 * include earlier pages of the flow kept in Chrome's back/forward cache.
 */
function memoryFindings(flowResult: LH.FlowResult): Finding[] {
    const findings: Finding[] = [];
    type Point = { stepIndex: number; step: string; pageUrl: string; mem: Record<string, number> };
    const sessions: Point[][] = [];
    // Sessions: consecutive steps on the same page (origin + path). Heap and counters are process-wide and
    // include earlier pages kept in the back/forward cache, which only change when the page changes, so
    // growth inside a session is the page's own. A navigation always starts a new session.
    flowResult.steps.forEach((step, stepIndex) => {
        const lhr = step.lhr;
        if (lhr.gatherMode === 'snapshot' || !lhr.audits) return;
        const mem = memoryOf(lhr);
        if (!mem) return;
        const point = { stepIndex, step: step.name, pageUrl: lhr.finalDisplayedUrl, mem };
        const current = sessions[sessions.length - 1];
        const samePage = current && apiPath(current[current.length - 1].pageUrl) === apiPath(point.pageUrl);
        if (lhr.gatherMode === 'navigation' || !samePage) sessions.push([point]);
        else current.push(point);
    });

    for (const session of sessions) {
        if (session.length < 3) continue;
        const grew = (id: string, minAbs: number, minRel: number) => {
            const series = session.map(p => p.mem[id]).filter((v): v is number => typeof v === 'number');
            if (series.length < 3) return undefined;
            const first = series[0], last = series[series.length - 1];
            const steady = series.every((v, i) => i === 0 || v >= series[i - 1] * 0.98);
            return steady && last - first >= minAbs && last - first >= first * minRel ? { first, last } : undefined;
        };
        const heap = grew('jsHeapUsed', 5 * MB, 0.2);
        const listeners = grew('jsEventListeners', 100, 0.3);
        const nodes = grew('domNodes', 500, 0.3);
        if (!heap && !listeners && !nodes) continue;
        const last = session[session.length - 1];
        const evidence = [
            heap ? `JS heap ${(heap.first / MB).toFixed(1)} → ${(heap.last / MB).toFixed(1)} MB` : '',
            listeners ? `event listeners ${listeners.first} → ${listeners.last}` : '',
            nodes ? `DOM nodes ${nodes.first} → ${nodes.last}` : '',
        ].filter(Boolean);
        findings.push({
            key: `memory:growth:${apiPath(session[0].pageUrl)}`,
            title: `Possible memory leak: memory keeps growing on ${shortScriptName(apiPath(session[0].pageUrl))}`,
            priority: 'P2',
            owner: 'frontend',
            category: 'Memory',
            metrics: [],
            impactMs: 0,
            impactBytes: heap ? heap.last - heap.first : 0,
            summary: `Over ${session.length} steps on the same page (measured after garbage collection) ${evidence.join(', ')}, ` +
                'growing with every step.',
            recommendation: 'Repeat the interaction in DevTools → Memory with "Allocations on timeline" or compare heap snapshots between ' +
                'repetitions; look for detached DOM trees, listeners added on every render without cleanup (removeEventListener / effect ' +
                'cleanup), timers and subscriptions that are never cleared, and caches that only grow.',
            references: ['https://developer.chrome.com/docs/devtools/memory-problems', 'https://web.dev/articles/detached-window-memory-leaks'],
            labels: ['performance', 'memory', 'leak'],
            occurrence: {
                stepIndex: last.stepIndex,
                step: `${session[0].step} → ${last.step}`,
                pageUrl: session[0].pageUrl,
                impact: evidence.join(', '),
                evidence: session.map(p => `${p.step}: JS heap ${(p.mem.jsHeapUsed / MB).toFixed(1)} MB, ${p.mem.jsEventListeners ?? '?'} listeners, ${p.mem.domNodes ?? '?'} DOM nodes`),
            },
        });
    }
    return findings;
}

/** Collects issues from every navigation and timespan step and merges the ones that repeat. */
export function collectFrontendIssues(flowResult: LH.FlowResult): FrontendIssue[] {
    const merged = new Map<string, FrontendIssue>();
    const perStep: Finding[] = [];
    flowResult.steps.forEach((step, stepIndex) => {
        const lhr = step.lhr;
        if ((lhr.gatherMode !== 'navigation' && lhr.gatherMode !== 'timespan') || !lhr.audits) return;
        const base = { stepIndex, step: step.name, pageUrl: lhr.finalDisplayedUrl };
        perStep.push(
            ...metricFindings(lhr, base),
            ...tbtScriptFindings(lhr, base),
            ...lighthouseAuditFindings(lhr, base),
            ...networkFindings(lhr, base),
            ...apiFindings(lhr, base),
        );
    });
    for (const { occurrence, ...finding } of [...perStep, ...memoryFindings(flowResult)]) {
        const existing = merged.get(finding.key);
        if (!existing) {
            merged.set(finding.key, { id: `PERF-${fnv1a(finding.key)}`, ...finding, occurrences: [occurrence] });
            continue;
        }
        existing.occurrences.push(occurrence);
        if (priorityRank[finding.priority] < priorityRank[existing.priority]) existing.priority = finding.priority;
        existing.impactMs = Math.max(existing.impactMs, finding.impactMs);
        existing.impactBytes = Math.max(existing.impactBytes, finding.impactBytes);
        existing.metrics = [...new Set([...existing.metrics, ...finding.metrics])];
        existing.labels = [...new Set([...existing.labels, ...finding.labels])];
    }
    return [...merged.values()].sort((a, b) =>
        priorityRank[a.priority] - priorityRank[b.priority] || b.impactMs - a.impactMs || b.impactBytes - a.impactBytes || b.occurrences.length - a.occurrences.length);
}

// ── Writers ────────────────────────────────────────────────────────────

const mdCell = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

function issueImpact(issue: FrontendIssue): string {
    const parts = [issue.impactMs > 0 ? `up to ${Math.round(issue.impactMs)} ms` : '', issue.impactBytes > 0 ? `up to ${fmtBytes(issue.impactBytes)}` : ''].filter(Boolean);
    return parts.join(', ') || '-';
}

/** Markdown body of one issue — ready to paste into a ticket. */
export function issueMarkdown(issue: FrontendIssue): string {
    const lines = [
        `## [${issue.priority}] ${issue.id} · ${issue.title}`,
        '',
        `**Priority:** ${issue.priority} · **Owner:** ${issue.owner} · **Category:** ${issue.category}` +
        `${issue.metrics.length ? ` · **Metrics:** ${issue.metrics.join(', ')}` : ''} · **Labels:** ${issue.labels.join(', ')}`,
        '',
        issue.summary,
        '',
        '**Where it happens**',
        '',
        '| Step | Page | Impact |',
        '|---|---|---|',
        ...issue.occurrences.map(o => `| ${mdCell(o.step)} | ${mdCell(o.pageUrl)} | ${mdCell(o.impact)} |`),
        '',
        '**Evidence**',
        '',
        ...issue.occurrences.flatMap(o => o.evidence.length ? [`- _${o.step}_`, ...o.evidence.map(e => `  - ${e}`)] : []),
        '',
        '**How to fix**',
        '',
        issue.recommendation,
        '',
    ];
    if (issue.references.length) lines.push('**References**', '', ...issue.references.map(r => `- ${r}`), '');
    return lines.join('\n');
}

export function issuesMarkdown(issues: FrontendIssue[], flowResult: LH.FlowResult, generatedAt: Date): string {
    const count = (p: IssuePriority) => issues.filter(i => i.priority === p).length;
    return [
        '# Performance issues for frontend developers',
        '',
        `Generated ${generatedAt.toISOString()} from the Lighthouse user flow "${flowResult.name}" (${flowResult.steps.length} steps): ` +
        `${issues.length} issues — ${count('P1')} P1, ${count('P2')} P2, ${count('P3')} P3.`,
        '',
        'Priorities: **P1** — poor Core Web Vital or ≥ 250 ms TBT / ≥ 500 ms estimated savings; **P2** — needs improvement or ≥ 100–150 ms / ≥ 100 KiB; **P3** — smaller wins. ' +
        'Issue ids are stable across runs, so a recurring problem keeps the same id.',
        '',
        '| ID | Priority | Issue | Metrics | Owner | Steps | Est. impact |',
        '|---|---|---|---|---|---|---|',
        ...issues.map(i => `| ${i.id} | ${i.priority} | ${mdCell(i.title)} | ${i.metrics.join(', ') || '-'} | ${i.owner} | ${i.occurrences.length} | ${issueImpact(i)} |`),
        '',
        ...issues.flatMap(i => ['---', '', issueMarkdown(i)]),
    ].join('\n');
}

const csvField = (s: string) => `"${s.replace(/"/g, '""')}"`;
const JIRA_PRIORITY: Record<IssuePriority, string> = { P1: 'High', P2: 'Medium', P3: 'Low' };

/** CSV for Jira's "Import issues from CSV" (map Summary, Issue Type, Priority, Labels, Description). */
export function issuesJiraCsv(issues: FrontendIssue[]): string {
    const labelColumns = Math.max(1, ...issues.map(i => i.labels.length));
    const header = ['Summary', 'Issue Type', 'Priority', ...Array(labelColumns).fill('Labels'), 'Description'];
    const rows = issues.map(i => [
        `${i.id}: ${i.title}`,
        'Task',
        JIRA_PRIORITY[i.priority],
        ...Array.from({ length: labelColumns }, (_, k) => (i.labels[k] ?? '').replace(/\s+/g, '-')),
        issueMarkdown(i),
    ]);
    return [header, ...rows].map(r => r.map(csvField).join(',')).join('\r\n');
}

export function issuesJson(issues: FrontendIssue[], flowResult: LH.FlowResult, generatedAt: Date): string {
    return JSON.stringify({
        generatedAt: generatedAt.toISOString(),
        flow: flowResult.name,
        steps: flowResult.steps.map((s, i) => ({ index: i, name: s.name, gatherMode: s.lhr.gatherMode, url: s.lhr.finalDisplayedUrl })),
        issues,
    }, null, 2);
}
