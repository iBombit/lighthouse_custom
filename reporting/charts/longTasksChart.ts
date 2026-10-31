import type { TaskGroupIds } from 'lighthouse/core/lib/tracehouse/task-groups.js';
import { esc, f, fmtMs, trunc } from './format.js';
import {
    BLOCKING_PATTERN, PARTY_COLOR, TASK_GROUP_STYLE, assignMarkerTiers, chartHeader, legend, markerLines, svgOpen, timeAxis,
    type ChartMarker, type Party,
} from './svg.js';

/** A top-level main-thread task drawn on the timeline. Times in ms from the step's time origin. */
export interface TaskBar {
    start: number;
    duration: number;
    /** Part of the task counted in TBT (blocking time inside the TBT window). */
    tbtImpact: number;
    /** Dominant activity of the task. */
    group: TaskGroupIds;
    /** Short description for the tooltip / label (e.g. main script). */
    label?: string;
}

/** A row of the "TBT contribution by script" bars. */
export interface ScriptBar {
    label: string;
    tooltip: string;
    value: number;
    party: Party;
}

export interface LongTasksChartInput {
    title: string;
    subtitle: string;
    /** End of the time axis (ms). */
    endMs: number;
    tasks: TaskBar[];
    window?: { start: number; end: number; label: string };
    markers: ChartMarker[];
    scripts: ScriptBar[];
    totalTbt: number;
}

const W = 1240;
const PAD = 20;
const LANE_LABEL_W = 96;
const X0 = PAD + LANE_LABEL_W;
const TL_W = W - X0 - PAD;
const LANE_H = 34;
const TIER_H = 14;
const ROW_H = 22;
const BAR_X = PAD + 420;
const BAR_MAX_W = W - BAR_X - PAD - 150;
const LONG_TASK_MS = 50;

/**
 * "Where does TBT come from?" chart: the main-thread lane with every task (blocking part hatched red,
 * DevTools-style), the TBT window and metric markers, plus TBT contribution per script.
 */
export function buildLongTasksChart(input: LongTasksChartInput): string {
    const endMs = Number.isFinite(input.endMs) && input.endMs > 0 ? input.endMs : 1;
    const px = TL_W / endMs;
    const markers = input.markers.map(m => ({ ...m }));
    const maxTier = assignMarkerTiers(markers, px);
    const scripts = input.scripts.slice(0, 10);

    const markerTop = 70;
    const laneTop = markerTop + (maxTier + 1) * TIER_H + 18;
    const laneBottom = laneTop + LANE_H;
    const axisY = laneBottom + 16;
    const scriptsTitleY = axisY + 34;
    const scriptsTop = scriptsTitleY + 12;
    const scriptsBottom = scriptsTop + Math.max(scripts.length, 1) * ROW_H;
    const legendY = scriptsBottom + 18;
    const H = legendY + 26;

    const out: string[] = [svgOpen(W, H, BLOCKING_PATTERN), chartHeader(PAD, input.title, input.subtitle)];

    // TBT window shading.
    if (input.window && input.window.end > input.window.start) {
        const ws = Math.max(0, input.window.start), we = Math.min(endMs, input.window.end);
        if (we > ws) {
            out.push(`<rect x="${f(X0 + ws * px)}" y="${laneTop - 16}" width="${f((we - ws) * px)}" height="${LANE_H + 16}" fill="#fff4cc"/>`);
            out.push(`<text x="${f(X0 + ws * px + 4)}" y="${laneTop - 5}" class="muted">${esc(input.window.label)}</text>`);
        }
    }

    // Lane background + label.
    out.push(`<rect x="${X0}" y="${laneTop}" width="${TL_W}" height="${LANE_H}" fill="#f1f3f4" rx="2"/>`);
    out.push(`<text x="${PAD}" y="${laneTop + LANE_H / 2 + 4}" class="section">Main thread</text>`);
    out.push(timeAxis(X0, TL_W, endMs, laneTop, laneBottom, axisY));

    // Tasks: non-blocking part in the activity color, blocking part (> 50 ms) hatched red.
    const groupsUsed = new Set<TaskGroupIds>();
    for (const task of input.tasks) {
        if (task.start > endMs) continue;
        const x = X0 + task.start * px;
        const w = Math.max(Math.min(task.duration, endMs - task.start) * px, 1.5);
        const nonBlockingW = Math.min(w, LONG_TASK_MS * px);
        const tip = `${task.duration >= LONG_TASK_MS ? 'Long task' : 'Task'} ${fmtMs(task.duration)} at ${fmtMs(task.start)}` +
            (task.duration > LONG_TASK_MS ? ` · blocking ${fmtMs(task.duration - LONG_TASK_MS)} · counted in TBT ${fmtMs(task.tbtImpact)}` : '') +
            ` · ${TASK_GROUP_STYLE[task.group].label}${task.label ? ` · ${task.label}` : ''}`;
        groupsUsed.add(task.group);
        out.push(`<g class="task"><title>${esc(tip)}</title>`);
        out.push(`<rect x="${f(x)}" y="${laneTop + 4}" width="${f(nonBlockingW)}" height="${LANE_H - 8}" fill="${TASK_GROUP_STYLE[task.group].color}"/>`);
        if (w > nonBlockingW) {
            out.push(`<rect x="${f(x + nonBlockingW)}" y="${laneTop + 4}" width="${f(w - nonBlockingW)}" height="${LANE_H - 8}" fill="url(#blocking)"/>`);
        }
        out.push(`</g>`);
    }

    // Duration labels for the longest tasks (skipping labels that would overlap).
    const labelled: number[] = [];
    for (const task of [...input.tasks].filter(t => t.duration > LONG_TASK_MS && t.start <= endMs).sort((a, b) => b.duration - a.duration).slice(0, 8)) {
        const cx = X0 + (task.start + Math.min(task.duration, endMs - task.start) / 2) * px;
        if (labelled.some(x => Math.abs(x - cx) < 44)) continue;
        labelled.push(cx);
        out.push(`<text x="${f(cx)}" y="${laneBottom + 30}" text-anchor="middle" class="val" fill="${'#b3261e'}">${fmtMs(task.duration)}</text>`);
    }

    out.push(markerLines(markers, X0, px, endMs, markerTop, TIER_H, laneBottom));

    // TBT contribution by script.
    out.push(`<text x="${PAD}" y="${scriptsTitleY}" class="section">TBT contribution by script</text>`);
    if (!scripts.length) {
        out.push(`<text x="${PAD}" y="${scriptsTop + 15}" class="muted">No blocking time in this step: no main-thread task in the TBT window took longer than 50 ms.</text>`);
    }
    const maxValue = Math.max(...scripts.map(s => s.value), 1);
    scripts.forEach((s, i) => {
        const y = scriptsTop + i * ROW_H;
        const w = Math.max((s.value / maxValue) * BAR_MAX_W, 2);
        const share = input.totalTbt > 0 ? ` · ${Math.round((s.value / input.totalTbt) * 100)}%` : '';
        out.push(`<g class="bar"><title>${esc(`${s.tooltip}\n${fmtMs(s.value)} of TBT${share}`)}</title>`);
        out.push(`<text x="${PAD}" y="${y + 15}" class="lbl">${esc(trunc(s.label, 68))}</text>`);
        out.push(`<rect x="${BAR_X}" y="${y + 4}" width="${f(w)}" height="${ROW_H - 8}" rx="2" fill="${PARTY_COLOR[s.party]}"/>`);
        out.push(`<text x="${f(BAR_X + w + 6)}" y="${y + 15}" class="val">${fmtMs(s.value)}${share}</text></g>`);
    });

    out.push(legend(PAD, legendY, [
        { label: 'Blocking time (> 50 ms)', fill: 'url(#blocking)' },
        ...[...groupsUsed].map(g => ({ label: TASK_GROUP_STYLE[g].label, fill: TASK_GROUP_STYLE[g].color })),
        ...(input.window ? [{ label: 'TBT window', fill: '#fff4cc' }] : []),
        { label: '1st party', fill: PARTY_COLOR.first },
        { label: '3rd party', fill: PARTY_COLOR.third },
    ]));

    out.push(`</svg>`);
    return out.join('\n');
}
