/**
 * @param {TraceEngine.Types.TraceEvents.TraceEventData[]} traceEvents
 */
export function runTraceEngine(traceEvents: TraceEngine.Types.TraceEvents.TraceEventData[]): Promise<TraceEngine.Handlers.Types.EnabledHandlerDataWithMeta<typeof TraceEngine.Handlers.ModelHandlers>>;
/**
 * @param {{trace: Lantern.Trace, settings?: Lantern.Simulation.Settings, URL?: Lantern.Simulation.URL}} opts
 */
export function getComputationDataFromFixture({ trace, settings, URL }: {
    trace: Lantern.Trace;
    settings?: Lantern.Simulation.Settings;
    URL?: Lantern.Simulation.URL;
}): Promise<{
    simulator: Lantern.Simulation.Simulator<any>;
    graph: import("../PageDependencyGraph.js").Node;
    processedNavigation: import("../types/lantern.js").Simulation.ProcessedNavigation;
}>;
import * as TraceEngine from '@paulirish/trace_engine';
import * as Lantern from '../lantern.js';
//# sourceMappingURL=MetricTestUtils.d.ts.map