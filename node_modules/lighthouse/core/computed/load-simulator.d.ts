export { LoadSimulatorComputed as LoadSimulator };
declare const LoadSimulatorComputed: typeof LoadSimulator & {
    request: (dependencies: {
        devtoolsLog: import("../index.js").DevtoolsLog;
        settings: LH.Audit.Context['settings'];
    }, context: import("../../types/utility-types.js").default.ImmutableObject<{
        computedCache: Map<string, import("../lib/arbitrary-equality-map.js").ArbitraryEqualityMap>;
    }>) => Promise<Lantern.Simulation.Simulator<any>>;
};
declare class LoadSimulator {
    /**
     * @param {{devtoolsLog: LH.DevtoolsLog, settings: LH.Audit.Context['settings']}} data
     * @param {LH.Artifacts.ComputedContext} context
     * @return {Promise<Lantern.Simulation.Simulator>}
     */
    static compute_(data: {
        devtoolsLog: import("../index.js").DevtoolsLog;
        settings: LH.Audit.Context['settings'];
    }, context: LH.Artifacts.ComputedContext): Promise<Lantern.Simulation.Simulator>;
    /**
     * @param {LH.Artifacts.NetworkAnalysis} networkAnalysis
     * @return {LH.PrecomputedLanternData}
     */
    static convertAnalysisToSaveableLanternData(networkAnalysis: LH.Artifacts.NetworkAnalysis): LH.PrecomputedLanternData;
}
import * as Lantern from '../lib/lantern/lantern.js';
import { NetworkAnalysis } from './network-analysis.js';
//# sourceMappingURL=load-simulator.d.ts.map