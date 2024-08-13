export type MetricName = import('@paulirish/trace_engine/models/trace/handlers/PageLoadMetricsHandler.js').MetricName;
export type MetricScore = import('@paulirish/trace_engine/models/trace/handlers/PageLoadMetricsHandler.js').MetricScore;
/** @typedef {import('@paulirish/trace_engine/models/trace/handlers/PageLoadMetricsHandler.js').MetricName} MetricName */
/** @typedef {import('@paulirish/trace_engine/models/trace/handlers/PageLoadMetricsHandler.js').MetricScore} MetricScore */
/**
 * @param {TraceEngine.Handlers.Types.TraceParseData} traceEngineData
 * @return {Lantern.Simulation.ProcessedNavigation}
 */
export function createProcessedNavigation(traceEngineData: TraceEngine.Handlers.Types.TraceParseData): Lantern.Simulation.ProcessedNavigation;
/**
 * @param {Lantern.Trace} trace
 * @param {TraceEngine.Handlers.Types.TraceParseData} traceEngineData
 * @return {Lantern.NetworkRequest[]}
 */
export function createNetworkRequests(trace: Lantern.Trace, traceEngineData: TraceEngine.Handlers.Types.TraceParseData): Lantern.NetworkRequest[];
/**
 * @param {Lantern.NetworkRequest[]} requests
 * @param {Lantern.Trace} trace
 * @param {TraceEngine.Handlers.Types.TraceParseData} traceEngineData
 * @param {Lantern.Simulation.URL=} URL
 */
export function createGraph(requests: Lantern.NetworkRequest[], trace: Lantern.Trace, traceEngineData: TraceEngine.Handlers.Types.TraceParseData, URL?: Lantern.Simulation.URL | undefined): import("./PageDependencyGraph.js").Node;
import * as TraceEngine from '@paulirish/trace_engine';
import * as Lantern from './lantern.js';
//# sourceMappingURL=TraceEngineComputationData.d.ts.map