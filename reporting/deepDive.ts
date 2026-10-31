/**
 * Deep-dive additions to the Custom Metrics category, made after Lighthouse has audited the flow: per-step
 * `web-vitals-overview` and `frontend-issues` audits, and HTML report enhancements.
 */
import type * as LH from 'lighthouse/types/lh.js';
import { svgToDataUri } from './charts/svg.js';
import { buildVitalsChart, formatVitalValue, type VitalRow } from './charts/vitalsChart.js';
import { METRIC_RULES, metricScoring, scoreStatus, type FrontendIssue, type IssuePriority } from './frontendIssues.js';

import { CUSTOM_CATEGORY_ID } from '../settings/configLoader.js';

/** Category that receives the deep-dive audits. */
export const DEEP_DIVE_CATEGORY = CUSTOM_CATEGORY_ID;
/** Audits whose SVG chart thumbnails are shown full width and open in a new tab when clicked. */
export const CHART_AUDITS = ['network-waterfall', 'web-vitals-overview', 'tbt-breakdown', 'main-thread-timeline', 'js-hotspots'];

type AuditResult = LH.Result['audits'][string];

const STATUS_LABEL = { good: 'Good', average: 'Needs improvement', poor: 'Poor' } as const;

/** Web Vitals of a step as a bullet chart + table (only metrics Lighthouse measured in this step). */
export function buildWebVitalsAudit(lhr: LH.Result): AuditResult | undefined {
    const rows: VitalRow[] = [];
    for (const rule of METRIC_RULES) {
        const audit = lhr.audits[rule.id];
        const scoring = audit && metricScoring(audit, rule);
        if (!audit || audit.numericValue === undefined || !scoring) continue;
        rows.push({
            label: `${rule.name} (${rule.short})`,
            value: audit.numericValue,
            display: formatVitalValue(audit.numericValue, rule.unit),
            good: scoring.p10,
            poor: scoring.median,
            unit: rule.unit,
            status: scoreStatus(audit.score ?? null),
        });
    }
    if (!rows.length) return undefined;
    const poor = rows.filter(r => r.status === 'poor').length;
    const average = rows.filter(r => r.status === 'average').length;
    const chart = buildVitalsChart(
        'Web Vitals at a glance',
        `${lhr.gatherMode === 'navigation' ? 'Page load' : 'User interaction (timespan)'} · ${lhr.configSettings.formFactor} thresholds · ` +
        `${rows.length - poor - average} good, ${average} need improvement, ${poor} poor`,
        rows,
    );
    return {
        id: 'web-vitals-overview',
        title: 'Web Vitals at a glance',
        description: 'Each metric against Lighthouse\'s scoring thresholds for this form factor: green is good (score ≥ 90), orange needs ' +
            'improvement, red is poor (score < 50). [Web Vitals](https://web.dev/articles/vitals).',
        score: null,
        scoreDisplayMode: 'informative',
        displayValue: `${rows.length - poor - average} good · ${average} need improvement · ${poor} poor`,
        details: {
            type: 'list',
            items: [
                { type: 'list-section', value: { type: 'table', headings: [{ key: 'chart', valueType: 'thumbnail', label: '' }], items: [{ chart: svgToDataUri(chart) }] } },
                {
                    type: 'list-section',
                    value: {
                        type: 'table',
                        headings: [
                            { key: 'metric', valueType: 'text', label: 'Metric' },
                            { key: 'value', valueType: 'text', label: 'Value' },
                            { key: 'status', valueType: 'text', label: 'Status' },
                            { key: 'good', valueType: 'text', label: 'Good ≤' },
                            { key: 'poor', valueType: 'text', label: 'Poor >' },
                        ],
                        items: rows.map(r => ({
                            metric: r.label, value: r.display, status: STATUS_LABEL[r.status],
                            good: formatVitalValue(r.good, r.unit), poor: formatVitalValue(r.poor, r.unit),
                        })),
                    },
                },
            ],
        },
    } as unknown as AuditResult;
}

/** The issues that occur in one step, as a report audit. */
export function buildIssuesAudit(stepIndex: number, issues: FrontendIssue[], files?: IssueFiles): AuditResult {
    const inStep = issues.filter(i => i.occurrences.some(o => o.stepIndex === stepIndex));
    const count = (p: IssuePriority) => inStep.filter(i => i.priority === p).length;
    const exported = files ? ` The issues of all steps, with stable ids, are exported to ${files.markdown}, ${files.json} and ${files.jiraCsv} (Jira CSV import).` : '';
    return {
        id: 'frontend-issues',
        title: 'Issues for frontend developers',
        description: 'Prioritized findings from this step, built from Lighthouse\'s failing insights and diagnostics, the metrics and the ' +
            `Total Blocking Time breakdown (P1 first; expand a row for the evidence).${exported}`,
        score: null,
        scoreDisplayMode: 'informative',
        displayValue: inStep.length ? `${inStep.length} issues: ${count('P1')} P1 · ${count('P2')} P2 · ${count('P3')} P3` : 'No issues found',
        details: inStep.length ? {
            type: 'table',
            headings: [
                { key: 'priority', valueType: 'text', label: 'Priority' },
                { key: 'title', valueType: 'text', label: 'Issue', subItemsHeading: { key: 'evidence', valueType: 'text' } },
                { key: 'metrics', valueType: 'text', label: 'Metrics' },
                { key: 'impact', valueType: 'text', label: 'Impact in this step' },
                { key: 'owner', valueType: 'text', label: 'Owner' },
                { key: 'id', valueType: 'text', label: 'ID' },
            ],
            items: inStep.map(issue => {
                const occurrence = issue.occurrences.find(o => o.stepIndex === stepIndex)!;
                return {
                    priority: issue.priority,
                    title: issue.title,
                    metrics: issue.metrics.join(', ') || '-',
                    impact: occurrence.impact,
                    owner: issue.owner,
                    id: issue.id,
                    subItems: { type: 'subitems', items: occurrence.evidence.slice(0, 8).map(evidence => ({ evidence })) },
                };
            }),
        } : undefined,
    } as unknown as AuditResult;
}

export interface IssueFiles {
    markdown: string;
    json: string;
    jiraCsv: string;
}

/**
 * Adds the `web-vitals-overview` and `frontend-issues` audits to the top of the Custom Metrics category
 * of every step that has it (navigation and timespan steps).
 */
export function enrichFlowResult(flowResult: LH.FlowResult, issues: FrontendIssue[], files?: IssueFiles): void {
    flowResult.steps.forEach((step, stepIndex) => {
        const category = step.lhr.categories[DEEP_DIVE_CATEGORY];
        if (!category) return;
        const added: string[] = [];
        step.lhr.audits['frontend-issues'] = buildIssuesAudit(stepIndex, issues, files);
        added.push('frontend-issues');
        const vitals = buildWebVitalsAudit(step.lhr);
        if (vitals) {
            step.lhr.audits['web-vitals-overview'] = vitals;
            added.push('web-vitals-overview');
        }
        category.auditRefs = [...added.map(id => ({ id, weight: 0 })), ...category.auditRefs.filter(ref => !added.includes(ref.id))];
    });
}

// ── HTML report enhancements ───────────────────────────────────────────

const sel = (suffix: string) => CHART_AUDITS.map(id => `[id="${id}"] ${suffix}`).join(',\n  ');

const DEEP_DIVE_CSS = `
<style>
  /* Use the window's width: the default 840 px column shrank the charts to about half their size. */
  .lh-vars { --report-content-max-width: 1440px !important; }
  /* ── Custom Metrics charts (incl. the network waterfall): full width, inlined by the script below ── */
  ${sel('.lh-table-column--thumbnail')} { width: 100%; }
  ${sel('.lh-thumbnail')} { width: 100%; height: auto; max-width: 100%; object-fit: contain; cursor: pointer; }
  ${sel('table:has(.lh-thumbnail) thead')} { display: none; }
  ${sel('.lh-details')} { overflow-x: auto; }
  .lh-fw-chart { position: relative; }
  .lh-fw-chart > svg { display: block; width: 100%; height: auto; }
  .lh-fw-chart__open { position: absolute; top: 6px; right: 8px; font: 12px system-ui, 'Segoe UI', Roboto, sans-serif;
    color: #1a73e8; background: rgba(255,255,255,.9); border: 1px solid #dadce0; border-radius: 4px; padding: 2px 8px; cursor: pointer; }
  .lh-list-section__title { font-weight: 600; }
  #lh-fw-panel { position: fixed; right: 16px; bottom: 16px; z-index: 10000; max-width: 360px; padding: 10px 14px;
    background: #fff; color: #202124; border: 1px solid #dadce0; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,.18);
    font: 13px/1.45 system-ui, 'Segoe UI', Roboto, sans-serif; }
  #lh-fw-panel a { color: #1a73e8; }
  #lh-fw-panel button { float: right; border: 0; background: none; font-size: 16px; line-height: 1; cursor: pointer; color: #5f6368; }
  #lh-fw-panel .p1 { color: #c5221f; font-weight: 600; }
</style>`;

const DEEP_DIVE_SCRIPT = `
<script>
  (function() {
    var CHARTS = ${JSON.stringify(CHART_AUDITS.map(id => `[id="${id}"] .lh-thumbnail`).join(', '))};
    var PREFIX = 'data:image/svg+xml;base64,';
    function decode(src) {
      var bytes = atob(src.slice(PREFIX.length));
      return decodeURIComponent(bytes.split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    }
    function auditTitle(el) {
      var audit = el.closest('.lh-audit');
      var t = audit && audit.querySelector('.lh-audit__title');
      return t ? t.textContent : 'Chart';
    }
    function openFull(svgText, title) {
      var w = window.open('', '_blank');
      if (!w) return;
      w.document.open();
      w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title.replace(/</g, '&lt;') + '</title>' +
        '<style>body{margin:0;display:flex;justify-content:center;background:#fff}svg{max-width:100%;height:auto}</style></head>' +
        '<body>' + svgText + '</body></html>');
      w.document.close();
    }
    /* The chart's own CSS would apply to the whole report once inlined: scope it to the chart. */
    function scopeStyles(svg, scope) {
      svg.querySelectorAll('style').forEach(function(style) {
        style.textContent = style.textContent.replace(/(^|\\})([^{}]+)\\{/g, function(m, close, selectors) {
          return close + selectors.split(',').map(function(s) { return scope + ' ' + s.trim(); }).join(',') + '{';
        });
      });
    }
    var counter = 0;
    /* Charts are inlined as SVG: crisp at any size, and hovering a bar / row shows its details in place. */
    function inline(img) {
      if (img.dataset.chartReady) return;
      img.dataset.chartReady = '1';
      var src = img.getAttribute('src') || '';
      if (src.indexOf(PREFIX) !== 0) return;
      var svgText;
      try { svgText = decode(src); } catch (e) { return; }
      var holder = document.createElement('div');
      holder.className = 'lh-fw-chart';
      holder.id = 'lh-fw-chart-' + (++counter);
      holder.innerHTML = svgText;
      var svg = holder.querySelector('svg');
      if (!svg) return;
      var w = svg.getAttribute('width'), h = svg.getAttribute('height');
      if (w && h && !svg.getAttribute('viewBox')) svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      scopeStyles(svg, '#' + holder.id);
      /* Unique ids: every chart defines the same patterns, and a reference to one inside a collapsed audit doesn't paint. */
      svg.querySelectorAll('[id]').forEach(function(el) {
        var oldRef = 'url(#' + el.id + ')';
        el.id = el.id + '-' + counter;
        ['fill', 'stroke'].forEach(function(attr) {
          svg.querySelectorAll('[' + attr + '="' + oldRef + '"]').forEach(function(n) { n.setAttribute(attr, 'url(#' + el.id + ')'); });
        });
      });
      var open = document.createElement('button');
      open.type = 'button';
      open.className = 'lh-fw-chart__open';
      open.textContent = 'Open full size ↗';
      open.title = 'Open the chart in a new tab';
      open.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openFull(svgText, auditTitle(img));
      });
      holder.appendChild(open);
      img.style.display = 'none';
      img.insertAdjacentElement('afterend', holder);
    }
    /* Fallback when an image could not be inlined: click opens it full size. */
    document.addEventListener('click', function(e) {
      var img = e.target.closest ? e.target.closest(CHARTS) : null;
      if (!img || img.style.display === 'none') return;
      e.preventDefault();
      e.stopPropagation();
      var src = img.src || '';
      if (src.indexOf(PREFIX) !== 0) { window.open(src, '_blank'); return; }
      openFull(decode(src), auditTitle(img));
    }, true);
    function scan() { document.querySelectorAll(CHARTS).forEach(inline); }
    new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
    scan();
  })();
</script>`;

export interface ReportPanel {
    issueCounts: Record<IssuePriority, number>;
    files?: IssueFiles;
    /** Trace files relative to the report, for the DevTools Performance panel. */
    traces: string[];
}

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function panelHtml(panel: ReportPanel): string {
    const total = panel.issueCounts.P1 + panel.issueCounts.P2 + panel.issueCounts.P3;
    const link = (href: string, label: string) => `<a href="${escHtml(href)}" target="_blank">${escHtml(label)}</a>`;
    const traces = panel.traces.length
        ? `<div style="margin-top:6px">DevTools traces (Performance panel → Load profile): ${panel.traces.map((t, i) => link(t, String(i + 1))).join(' · ')}</div>`
        : '';
    return `
<div id="lh-fw-panel" role="complementary" aria-label="Performance deep dive">
  <button type="button" title="Hide" onclick="this.parentNode.remove()">×</button>
  <b>Performance deep dive</b>
  <div>${total} issues for developers: <span class="p1">${panel.issueCounts.P1} P1</span> · ${panel.issueCounts.P2} P2 · ${panel.issueCounts.P3} P3</div>
  ${panel.files ? `<div>${link(panel.files.markdown, 'Markdown')} · ${link(panel.files.json, 'JSON')} · ${link(panel.files.jiraCsv, 'Jira CSV')}</div>` : ''}
  <div style="color:#5f6368">Charts &amp; details: "Custom Metrics" section of each page-load / interaction step.</div>
  ${traces}
</div>`;
}

/**
 * Injects CSS + JS into the Lighthouse HTML report: clickable full-width chart thumbnails
 * (waterfall and deep-dive charts) and, when given, the deep-dive panel with links.
 */
export function injectReportEnhancements(html: string, panel?: ReportPanel): string {
    let out = html.replace('</head>', () => DEEP_DIVE_CSS + DEEP_DIVE_SCRIPT + '\n</head>');
    const bodyEnd = out.lastIndexOf('</body>');
    if (panel && bodyEnd >= 0) out = out.slice(0, bodyEnd) + panelHtml(panel) + '\n' + out.slice(bodyEnd);
    return out;
}
