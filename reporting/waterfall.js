import fs from 'fs/promises';
import path from 'path';
import logger from 'lh-pptr-framework/logger/logger.js';

/**
 * Generates a standalone network-waterfall SVG for every flow step that
 * contains a `network-requests` audit.  Files are written to `reportsDir`.
 *
 * @param {object}  flowResult  – Lighthouse `createFlowResult()` output.
 * @param {string}  reportsDir  – Destination folder (default ./reports).
 */
export async function generateWaterfalls(flowResult, reportsDir = './reports') {
    await fs.mkdir(reportsDir, { recursive: true });

    for (let i = 0; i < flowResult.steps.length; i++) {
        const step = flowResult.steps[i];
        const lhr  = step.lhr;

        const networkAudit = lhr.audits?.['network-requests'];
        if (!networkAudit?.details?.items?.length) continue;

        // ── Collect individual requests from grouped items ─────────────
        const requests     = [];
        const entityGroups = [];

        for (const group of networkAudit.details.items) {
            const entityName = group.entity || group.url || 'Unknown';
            const subItems   = group.subItems?.items || [group];

            entityGroups.push({
                name: entityName,
                startIndex: requests.length,
                count: subItems.length,
                totalDuration: group.duration ?? 0,
                totalTransfer: group.transferSize ?? 0,
            });

            for (const item of subItems) {
                requests.push({
                    url: item.url,
                    start: item.networkRequestTime ?? 0,
                    duration: item.duration ?? 0,
                    transferSize: item.transferSize ?? 0,
                    resourceSize: item.resourceSize ?? 0,
                    statusCode: item.statusCode,
                    mimeType: item.mimeType || '',
                    entity: entityName,
                });
            }
        }

        if (requests.length === 0) continue;

        // ── Key timing metrics (use observed = real, not throttled) ────
        const m = lhr.audits?.['metrics']?.details?.items?.[0] || {};
        const timingMarkers = [];
        if (m.observedFirstContentfulPaint)      timingMarkers.push({ t: m.observedFirstContentfulPaint,      label: 'FCP',  color: '#1a73e8' });
        if (m.observedLargestContentfulPaint)     timingMarkers.push({ t: m.observedLargestContentfulPaint,     label: 'LCP',  color: '#0cce6b' });
        if (m.observedDomContentLoaded)           timingMarkers.push({ t: m.observedDomContentLoaded,           label: 'DCL',  color: '#4a90d9' });
        if (m.observedLoad)                       timingMarkers.push({ t: m.observedLoad,                       label: 'Load', color: '#e86c8d' });
        // Fallback to simulated if observed not available
        if (!timingMarkers.length) {
            if (m.firstContentfulPaint)            timingMarkers.push({ t: m.firstContentfulPaint,              label: 'FCP',  color: '#1a73e8' });
            if (m.largestContentfulPaint)           timingMarkers.push({ t: m.largestContentfulPaint,            label: 'LCP',  color: '#0cce6b' });
            if (m.interactive)                      timingMarkers.push({ t: m.interactive,                       label: 'TTI',  color: '#f5a623' });
        }

        const stepName = step.name || `Step ${i + 1}`;
        const svg = buildWaterfallSVG(requests, entityGroups, timingMarkers, stepName);

        const safeName = stepName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filePath = path.join(reportsDir, `waterfall_${safeName}.svg`);
        await fs.writeFile(filePath, svg, 'utf-8');
        logger.debug(`[WATERFALL] ${filePath}`);
    }
}

// ═══════════════════════════════════════════════════════════════════════
//  SVG builder  (exported for use by the network-waterfall audit)
// ═══════════════════════════════════════════════════════════════════════

export function buildWaterfallSVG(requests, entityGroups, timingMarkers, stepName) {
    // Layout
    const LABEL_W       = 340;
    const TIMELINE_W    = 880;
    const PAD_L         = 20;
    const PAD_R         = 20;
    const TOTAL_W       = PAD_L + LABEL_W + TIMELINE_W + PAD_R;
    const ROW_H         = 22;
    const ENTITY_ROW_H  = 28;
    const BAR_H         = 14;
    const HEADER_H      = 56;         // title + subtitle
    const LEGEND_H      = 34;
    const TIER_H        = 24;         // vertical space per stagger tier
    const MIN_LABEL_GAP = 50;         // min px between marker labels before staggering

    // Sort markers by time and assign stagger tiers to avoid overlapping labels
    timingMarkers.sort((a, b) => a.t - b.t);

    // Computed dims (need maxTime first for tier assignment)
    const contentRows    = requests.length;
    const entityHeaders  = entityGroups.length;
    const CONTENT_H      = contentRows * ROW_H + entityHeaders * ENTITY_ROW_H;

    // Time scale
    const maxTime   = Math.max(...requests.map(r => r.start + r.duration), 1);
    const timeScale = TIMELINE_W / maxTime;
    const tlX       = PAD_L + LABEL_W;   // timeline x-origin

    // Assign stagger tiers so nearby labels don't overlap
    let maxTier = 0;
    for (let i = 0; i < timingMarkers.length; i++) {
        const mk = timingMarkers[i];
        const xPx = mk.t * timeScale;
        // Find the lowest tier that doesn't collide with a previous marker
        let tier = 0;
        for (let j = 0; j < i; j++) {
            const prev = timingMarkers[j];
            const prevXPx = prev.t * timeScale;
            if (prev._tier === tier && Math.abs(xPx - prevXPx) < MIN_LABEL_GAP) {
                tier++;
                j = -1; // re-check all previous markers at the new tier
            }
        }
        mk._tier = tier;
        if (tier > maxTier) maxTier = tier;
    }

    const AXIS_H  = 32 + maxTier * TIER_H;
    const TOTAL_H = HEADER_H + AXIS_H + CONTENT_H + LEGEND_H + 10;

    // Nice axis ticks
    const tickInt  = niceTickInterval(maxTime);
    const ticks    = [];
    for (let t = 0; t <= maxTime + tickInt * 0.5; t += tickInt) ticks.push(t);

    const totalTransfer = requests.reduce((s, r) => s + r.transferSize, 0);

    // ── Start SVG ──────────────────────────────────────────────────────
    const lines = [];
    const w = (s) => lines.push(s);       // write helper

    w(`<svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL_W}" height="${TOTAL_H}" font-family="'Segoe UI',system-ui,Roboto,Helvetica,Arial,sans-serif" font-size="11">`);

    // ── Styles ─────────────────────────────────────────────────────────
    w(`<defs><style>`);
    w(`.bg{fill:#fff} .title{font-size:15px;font-weight:700;fill:#202124}`);
    w(`.subtitle{font-size:11px;fill:#5f6368}`);
    w(`.entity-hdr{font-size:12px;font-weight:600;fill:#202124}`);
    w(`.entity-sum{font-size:10px;fill:#80868b}`);
    w(`.url{font-size:10.5px;fill:#5f6368}`);
    w(`.url-1p{font-size:10.5px;fill:#202124;font-weight:500}`);
    w(`.ax{font-size:10px;fill:#80868b}`);
    w(`.tm-lbl{font-size:10px;font-weight:600}`);
    w(`.grid{stroke:#e8eaed;stroke-width:1}`);
    w(`.tm-line{stroke-width:1.5;stroke-dasharray:5,3}`);
    w(`.bar{rx:2} .bar:hover{opacity:.75;stroke:#202124;stroke-width:1}`);
    w(`.legend-lbl{font-size:10px;fill:#5f6368}`);
    w(`</style></defs>`);

    // Background
    w(`<rect width="${TOTAL_W}" height="${TOTAL_H}" class="bg" rx="8"/>`);

    // ── Header ─────────────────────────────────────────────────────────
    w(`<text x="${PAD_L}" y="24" class="title">${esc(stepName)}</text>`);
    w(`<text x="${PAD_L}" y="42" class="subtitle">${requests.length} requests · ${fmtMs(maxTime)} total · ${fmtBytes(totalTransfer)} transferred</text>`);

    // ── Time axis ──────────────────────────────────────────────────────
    const axisY = HEADER_H;
    const bodyTop = axisY + AXIS_H;

    // Axis baseline
    w(`<line x1="${tlX}" y1="${bodyTop}" x2="${tlX + TIMELINE_W}" y2="${bodyTop}" stroke="#dadce0"/>`);

    // Gridlines + tick labels
    for (const t of ticks) {
        const x = tlX + t * timeScale;
        if (x > tlX + TIMELINE_W + 1) break;
        w(`<line x1="${x}" y1="${bodyTop}" x2="${x}" y2="${bodyTop + CONTENT_H}" class="grid"/>`);
        w(`<text x="${x}" y="${bodyTop - 8}" text-anchor="middle" class="ax">${fmtMs(t)}</text>`);
    }

    // Key timing markers (vertical lines spanning the full chart)
    for (const mk of timingMarkers) {
        if (mk.t > maxTime * 1.05) continue;   // skip if way beyond chart
        const x = tlX + mk.t * timeScale;
        const tierOff = (mk._tier || 0) * TIER_H;
        w(`<line x1="${x}" y1="${axisY + 4 + tierOff}" x2="${x}" y2="${bodyTop + CONTENT_H}" class="tm-line" stroke="${mk.color}"/>`);
        w(`<text x="${x}" y="${axisY + 14 + tierOff}" text-anchor="middle" class="tm-lbl" fill="${mk.color}">${mk.label}</text>`);
        w(`<text x="${x}" y="${axisY + 24 + tierOff}" text-anchor="middle" class="ax" fill="${mk.color}">${fmtMs(mk.t)}</text>`);
    }

    // ── Rows ───────────────────────────────────────────────────────────
    let y = bodyTop;
    let rowIdx = 0;
    const firstEntityName = entityGroups[0]?.name;

    for (const group of entityGroups) {
        // Entity header band
        const bandFill = rowIdx % 2 === 0 ? '#f8f9fa' : '#f1f3f4';
        w(`<rect x="0" y="${y}" width="${TOTAL_W}" height="${ENTITY_ROW_H}" fill="${bandFill}"/>`);

        // Colored dot
        const dot = entityDotColor(group.name);
        w(`<circle cx="${PAD_L + 8}" cy="${y + ENTITY_ROW_H / 2}" r="5" fill="${dot}"/>`);

        // Entity name
        w(`<text x="${PAD_L + 20}" y="${y + ENTITY_ROW_H / 2 + 4}" class="entity-hdr">${esc(trunc(group.name, 38))}</text>`);

        // Summary on the right side of label column
        const sum = `${group.count} req · ${fmtMs(group.totalDuration)} · ${fmtBytes(group.totalTransfer)}`;
        w(`<text x="${PAD_L + LABEL_W - 8}" y="${y + ENTITY_ROW_H / 2 + 4}" text-anchor="end" class="entity-sum">${sum}</text>`);

        y += ENTITY_ROW_H;

        // Individual request rows
        for (let i = 0; i < group.count; i++) {
            const req = requests[group.startIndex + i];
            const rowFill = rowIdx % 2 === 0 ? '#fff' : '#fafbfc';
            w(`<rect x="0" y="${y}" width="${TOTAL_W}" height="${ROW_H}" fill="${rowFill}"/>`);

            // URL label (bold for 1st-party)
            const isFirstParty = req.entity === firstEntityName;
            const urlLabel = truncUrl(req.url, 44);
            const urlClass = isFirstParty ? 'url-1p' : 'url';
            w(`<text x="${PAD_L + 20}" y="${y + ROW_H / 2 + 4}" class="${urlClass}"><title>${esc(req.url)}</title>${esc(urlLabel)}</text>`);

            // Bar
            const barX = tlX + req.start * timeScale;
            const barW = Math.max(req.duration * timeScale, 3);
            const barY = y + (ROW_H - BAR_H) / 2;
            const fill = mimeColor(req.mimeType);

            w(`<rect x="${f(barX)}" y="${f(barY)}" width="${f(barW)}" height="${BAR_H}" fill="${fill}" class="bar">`);
            w(`<title>${esc(req.url)}\n${fmtMs(req.start)} → ${fmtMs(req.start + req.duration)} (${fmtMs(req.duration)})\n${fmtBytes(req.transferSize)} · ${req.statusCode || '?'} · ${req.mimeType}</title>`);
            w(`</rect>`);

            // Duration label inside bar (only if wide enough)
            if (barW > 40) {
                w(`<text x="${f(barX + barW / 2)}" y="${f(barY + BAR_H / 2 + 3.5)}" text-anchor="middle" fill="#fff" font-size="9" font-weight="500">${fmtMs(req.duration)}</text>`);
            }

            y += ROW_H;
            rowIdx++;
        }
    }

    // ── Legend ──────────────────────────────────────────────────────────
    const legY = y + 14;

    // MIME type legend
    const mimeItems = [
        { label: 'HTML',     c: '#7b61ff' },
        { label: 'JS',       c: '#f5a623' },
        { label: 'CSS',      c: '#4a90d9' },
        { label: 'Image',    c: '#4ecdc4' },
        { label: 'Font',     c: '#e86c8d' },
        { label: 'JSON/API', c: '#50e3c2' },
        { label: 'Other',    c: '#999'    },
    ];

    let lx = PAD_L;
    for (const m of mimeItems) {
        w(`<rect x="${lx}" y="${legY}" width="10" height="10" fill="${m.c}" rx="2"/>`);
        w(`<text x="${lx + 14}" y="${legY + 9}" class="legend-lbl">${m.label}</text>`);
        lx += 14 + m.label.length * 6.5 + 14;
    }

    // Timing marker legend
    lx += 10;
    for (const mk of timingMarkers) {
        w(`<line x1="${lx}" y1="${legY + 1}" x2="${lx + 14}" y2="${legY + 9}" stroke="${mk.color}" stroke-width="1.5" stroke-dasharray="3,2"/>`);
        w(`<text x="${lx + 18}" y="${legY + 9}" class="legend-lbl" fill="${mk.color}">${mk.label}</text>`);
        lx += 18 + mk.label.length * 6.5 + 14;
    }

    w(`</svg>`);
    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════════

function mimeColor(mime = '') {
    if (mime.includes('javascript'))    return '#f5a623';
    if (mime.includes('css'))           return '#4a90d9';
    if (mime.includes('html'))          return '#7b61ff';
    if (mime.includes('json'))          return '#50e3c2';
    if (mime.includes('image'))         return '#4ecdc4';
    if (mime.includes('font'))          return '#e86c8d';
    return '#999';
}

function entityDotColor(name = '') {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    return `hsl(${Math.abs(h) % 360},55%,55%)`;
}

function niceTickInterval(max) {
    for (const iv of [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 30000, 60000]) {
        if (max / iv <= 12) return iv;
    }
    return Math.ceil(max / 10 / 1000) * 1000;
}

function fmtMs(ms) {
    if (ms >= 60000) return `${(ms / 1000).toFixed(0)}s`;
    if (ms >= 10000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms >= 1000)  return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.round(ms)}ms`;
}

function fmtBytes(b) {
    if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
    if (b >= 1024)    return `${(b / 1024).toFixed(0)} KB`;
    return `${b} B`;
}

function truncUrl(url, max) {
    try {
        const u = new URL(url);
        let d = u.pathname + u.search;
        if (d.length > max) d = '…' + d.slice(-(max - 1));
        return `${d}(${u.hostname})`;
    } catch {
        return url.length > max ? '…' + url.slice(-(max - 1)) : url;
    }
}

function trunc(s, max) {
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function f(n) { return n.toFixed(1); }
