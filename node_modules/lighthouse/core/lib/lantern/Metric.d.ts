export type Node = import('./BaseNode.js').Node;
export type NetworkNode = import('./NetworkNode.js').NetworkNode;
export type Simulator = import('./simulation/Simulator.js').Simulator;
export type Extras = {
    optimistic: boolean;
    fcpResult?: Lantern.Metrics.Result | undefined;
    lcpResult?: Lantern.Metrics.Result | undefined;
    interactiveResult?: Lantern.Metrics.Result | undefined;
    observedSpeedIndex?: number | undefined;
};
/** @typedef {import('./BaseNode.js').Node} Node */
/** @typedef {import('./NetworkNode.js').NetworkNode} NetworkNode */
/** @typedef {import('./simulation/Simulator.js').Simulator} Simulator */
/**
 * @typedef Extras
 * @property {boolean} optimistic
 * @property {Lantern.Metrics.Result=} fcpResult
 * @property {Lantern.Metrics.Result=} lcpResult
 * @property {Lantern.Metrics.Result=} interactiveResult
 * @property {number=} observedSpeedIndex
 */
export class Metric {
    /**
     * @param {Node} dependencyGraph
     * @param {function(NetworkNode):boolean=} treatNodeAsRenderBlocking
     * @return {Set<string>}
     */
    static getScriptUrls(dependencyGraph: Node, treatNodeAsRenderBlocking?: ((arg0: NetworkNode) => boolean) | undefined): Set<string>;
    /**
     * @return {Lantern.Simulation.MetricCoefficients}
     */
    static get COEFFICIENTS(): import("./types/lantern.js").Simulation.MetricCoefficients;
    /**
     * Returns the coefficients, scaled by the throttling settings if needed by the metric.
     * Some lantern metrics (speed-index) use components in their estimate that are not
     * from the simulator. In this case, we need to adjust the coefficients as the target throttling
     * settings change.
     *
     * @param {number} rttMs
     * @return {Lantern.Simulation.MetricCoefficients}
     */
    static getScaledCoefficients(rttMs: number): Lantern.Simulation.MetricCoefficients;
    /**
     * @param {Node} dependencyGraph
     * @param {Lantern.Simulation.ProcessedNavigation} processedNavigation
     * @return {Node}
     */
    static getOptimisticGraph(dependencyGraph: Node, processedNavigation: Lantern.Simulation.ProcessedNavigation): Node;
    /**
     * @param {Node} dependencyGraph
     * @param {Lantern.Simulation.ProcessedNavigation} processedNavigation
     * @return {Node}
     */
    static getPessimisticGraph(dependencyGraph: Node, processedNavigation: Lantern.Simulation.ProcessedNavigation): Node;
    /**
     * @param {Lantern.Simulation.Result} simulationResult
     * @param {Extras} extras
     * @return {Lantern.Simulation.Result}
     */
    static getEstimateFromSimulation(simulationResult: Lantern.Simulation.Result, extras: Extras): Lantern.Simulation.Result;
    /**
     * @param {Lantern.Simulation.MetricComputationDataInput} data
     * @param {Omit<Extras, 'optimistic'>=} extras
     * @return {Promise<Lantern.Metrics.Result>}
     */
    static compute(data: Lantern.Simulation.MetricComputationDataInput, extras?: Omit<Extras, 'optimistic'> | undefined): Promise<Lantern.Metrics.Result>;
}
import * as Lantern from './lantern.js';
//# sourceMappingURL=Metric.d.ts.map