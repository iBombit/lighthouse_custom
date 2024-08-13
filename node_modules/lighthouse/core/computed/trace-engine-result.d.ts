export { TraceEngineResultComputed as TraceEngineResult };
declare const TraceEngineResultComputed: typeof TraceEngineResult & {
    request: (dependencies: {
        trace: LH.Trace;
    }, context: LH.Util.ImmutableObject<{
        computedCache: Map<string, import("../lib/arbitrary-equality-map.js").ArbitraryEqualityMap>;
    }>) => Promise<LH.Artifacts.TraceEngineResult>;
};
/**
 * @fileoverview Processes trace with the shared trace engine.
 */
declare class TraceEngineResult {
    /**
     * @param {LH.TraceEvent[]} traceEvents
     * @return {Promise<LH.Artifacts.TraceEngineResult>}
     */
    static runTraceEngine(traceEvents: LH.TraceEvent[]): Promise<LH.Artifacts.TraceEngineResult>;
    /**
     * @param {{trace: LH.Trace}} data
     * @param {LH.Artifacts.ComputedContext} context
     * @return {Promise<LH.Artifacts.TraceEngineResult>}
     */
    static compute_(data: {
        trace: LH.Trace;
    }, context: LH.Artifacts.ComputedContext): Promise<LH.Artifacts.TraceEngineResult>;
}
import * as LH from '../../types/lh.js';
//# sourceMappingURL=trace-engine-result.d.ts.map