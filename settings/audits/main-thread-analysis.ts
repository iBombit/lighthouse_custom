/**
 * Pure analysis of Lighthouse main-thread tasks (TaskNode trees, optionally with the TBT fields
 * added by Lighthouse's TBTImpactTasks). Shared by the tbt-breakdown and main-thread-timeline audits.
 */
import type { TaskGroupIds } from 'lighthouse/core/lib/tracehouse/task-groups.js';

/** Duration above which a task is "long"; the excess is its blocking time. */
export const LONG_TASK_MS = 50;

/** The parts of Lighthouse's `TaskNode` / `TBTImpactTask` used here (times in ms from the time origin). */
export interface AnalysisTask {
    startTime: number;
    endTime: number;
    duration: number;
    selfTime: number;
    group: { id: TaskGroupIds };
    children: AnalysisTask[];
    parent?: AnalysisTask;
    attributableURLs: string[];
    event: object;
    /** Blocking time of the task (and descendants) inside the TBT window. */
    tbtImpact?: number;
    /** `tbtImpact` minus the children's. */
    selfTbtImpact?: number;
    /** Blocking time regardless of the TBT window, minus the children's. */
    selfBlockingTime?: number;
}

export type UrlOf = (task: AnalysisTask) => string;

/** Calls `cb` for every interval in which `task` or a descendant was running its own code (not a child's). */
export function forEachSelfInterval(task: AnalysisTask, cb: (start: number, end: number, group: TaskGroupIds) => void): void {
    const children = [...task.children].sort((a, b) => a.startTime - b.startTime);
    let cursor = task.startTime;
    for (const child of children) {
        const childStart = Math.min(Math.max(child.startTime, task.startTime), task.endTime);
        if (childStart > cursor) cb(cursor, childStart, task.group.id);
        cursor = Math.max(cursor, Math.min(child.endTime, task.endTime));
        forEachSelfInterval(child, cb);
    }
    if (task.endTime > cursor) cb(cursor, task.endTime, task.group.id);
}

/** Main-thread busy time per activity in `binCount` equal bins over `[0, endMs]`. */
export function activityBins(topLevelTasks: AnalysisTask[], endMs: number, binCount: number): { binMs: number; bins: Array<Partial<Record<TaskGroupIds, number>>> } {
    const bins: Array<Partial<Record<TaskGroupIds, number>>> = Array.from({ length: binCount }, () => ({}));
    if (!Number.isFinite(endMs) || endMs <= 0 || binCount <= 0) return { binMs: 0, bins };
    const binMs = endMs / binCount;
    const binOf = (t: number) => Math.min(Math.max(Math.floor(t / binMs), 0), binCount - 1);
    for (const task of topLevelTasks) {
        forEachSelfInterval(task, (start, end, group) => {
            const a = Math.max(0, start);
            const b = Math.min(endMs, end);
            if (!(b > a)) return;
            // Bounded loop over bin indices: rounding at bin boundaries can't stall it.
            for (let i = binOf(a); i <= binOf(b); i++) {
                const overlap = Math.min(b, (i + 1) * binMs) - Math.max(a, i * binMs);
                if (overlap > 0) bins[i][group] = (bins[i][group] ?? 0) + overlap;
            }
        });
    }
    return { binMs, bins };
}

/** Self time per activity over the task and all its descendants. */
export function selfTimeByGroup(task: AnalysisTask, into = new Map<TaskGroupIds, number>()): Map<TaskGroupIds, number> {
    into.set(task.group.id, (into.get(task.group.id) ?? 0) + task.selfTime);
    for (const child of task.children) selfTimeByGroup(child, into);
    return into;
}

/** Self time per attributed script URL over the task and all its descendants. */
export function selfTimeByUrl(task: AnalysisTask, urlOf: UrlOf, into = new Map<string, number>()): Map<string, number> {
    const url = urlOf(task);
    into.set(url, (into.get(url) ?? 0) + task.selfTime);
    for (const child of task.children) selfTimeByUrl(child, urlOf, into);
    return into;
}

/** Map entries sorted by value, largest first. */
export function sortedEntries<K>(map: Map<K, number>): Array<[K, number]> {
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

/** The topmost ancestor of a task. */
export function topLevelOf(task: AnalysisTask): AnalysisTask {
    let t = task;
    while (t.parent) t = t.parent;
    return t;
}

export interface UrlBlocking {
    url: string;
    /** Blocking time inside the TBT window attributed to the script (sums to TBT). */
    tbtImpact: number;
    /** Blocking time attributed to the script regardless of the TBT window. */
    blockingTime: number;
    /** All main-thread time attributed to the script. */
    selfTime: number;
    /** Number of distinct long tasks in which the script contributed to TBT. */
    longTasks: number;
}

/**
 * Attributes self TBT impact, self blocking time and self time of every task (flat list incl.
 * descendants, as returned by TBTImpactTasks) to script URLs. Sorted by TBT impact.
 */
export function blockingByUrl(tasks: AnalysisTask[], urlOf: UrlOf): UrlBlocking[] {
    const byUrl = new Map<string, { tbt: number; blocking: number; self: number; longTasks: Set<object> }>();
    for (const task of tasks) {
        const url = urlOf(task);
        const entry = byUrl.get(url) ?? { tbt: 0, blocking: 0, self: 0, longTasks: new Set<object>() };
        entry.tbt += task.selfTbtImpact ?? 0;
        entry.blocking += task.selfBlockingTime ?? 0;
        entry.self += task.selfTime;
        if ((task.selfTbtImpact ?? 0) > 0) entry.longTasks.add(topLevelOf(task).event);
        byUrl.set(url, entry);
    }
    return [...byUrl.entries()]
        .map(([url, e]) => ({ url, tbtImpact: e.tbt, blockingTime: e.blocking, selfTime: e.self, longTasks: e.longTasks.size }))
        .sort((a, b) => b.tbtImpact - a.tbtImpact || b.blockingTime - a.blockingTime || b.selfTime - a.selfTime);
}

export interface LongTaskSummary {
    startTime: number;
    duration: number;
    /** Time above 50 ms. */
    blockingTime: number;
    /** Blocking time inside the TBT window. */
    tbtImpact: number;
    /** Activity with the most self time in the task. */
    mainGroup: TaskGroupIds;
    groups: Array<{ group: TaskGroupIds; ms: number }>;
    /** Scripts by self time inside the task. */
    urls: Array<{ url: string; ms: number }>;
}

/** Summary of a top-level task: blocking, TBT impact, activity mix and the scripts that ran in it. */
export function summarizeTask(task: AnalysisTask, urlOf: UrlOf): LongTaskSummary {
    const groups = sortedEntries(selfTimeByGroup(task)).map(([group, ms]) => ({ group, ms }));
    return {
        startTime: task.startTime,
        duration: task.duration,
        blockingTime: Math.max(task.duration - LONG_TASK_MS, 0),
        tbtImpact: task.tbtImpact ?? 0,
        mainGroup: groups[0]?.group ?? task.group.id,
        groups,
        urls: sortedEntries(selfTimeByUrl(task, urlOf)).map(([url, ms]) => ({ url, ms })),
    };
}

/** Main-thread time per activity, overall and inside long tasks. */
export function activityTotals(topLevelTasks: AnalysisTask[]): Array<{ group: TaskGroupIds; total: number; inLongTasks: number }> {
    const total = new Map<TaskGroupIds, number>();
    const inLong = new Map<TaskGroupIds, number>();
    for (const task of topLevelTasks) {
        selfTimeByGroup(task, total);
        if (task.duration > LONG_TASK_MS) selfTimeByGroup(task, inLong);
    }
    return sortedEntries(total).map(([group, ms]) => ({ group, total: ms, inLongTasks: inLong.get(group) ?? 0 }));
}

/** Short, readable name for a script URL (`file.js` + host), or the label itself for non-URLs. */
export function shortScriptName(url: string): string {
    try {
        const u = new URL(url);
        const file = u.pathname.split('/').filter(Boolean).pop() || u.pathname || '/';
        return `${decodeURIComponent(file)} (${u.hostname})`;
    } catch {
        return url;
    }
}
