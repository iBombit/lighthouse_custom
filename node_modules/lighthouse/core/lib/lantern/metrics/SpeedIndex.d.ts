export type Node = import('../BaseNode.js').Node;
/** @typedef {import('../BaseNode.js').Node} Node */
export class SpeedIndex extends Lantern.Metric {
    /**
     * @param {Node} dependencyGraph
     * @return {Node}
     */
    static getOptimisticGraph(dependencyGraph: Node): Node;
    /**
     * @param {Node} dependencyGraph
     * @return {Node}
     */
    static getPessimisticGraph(dependencyGraph: Node): Node;
    /**
     * Approximate speed index using layout events from the simulated node timings.
     * The layout-based speed index is the weighted average of the endTime of CPU nodes that contained
     * a 'Layout' task. log(duration) is used as the weight to stand for "significance" to the page.
     *
     * If no layout events can be found or the endTime of a CPU task is too early, FCP is used instead.
     *
     * This approach was determined after evaluating the accuracy/complexity tradeoff of many
     * different methods. Read more in the evaluation doc.
     *
     * @see https://docs.google.com/document/d/1qJWXwxoyVLVadezIp_Tgdk867G3tDNkkVRvUJSH3K1E/edit#
     * @param {Lantern.Simulation.Result['nodeTimings']} nodeTimings
     * @param {number} fcpTimeInMs
     * @return {number}
     */
    static computeLayoutBasedSpeedIndex(nodeTimings: Lantern.Simulation.Result['nodeTimings'], fcpTimeInMs: number): number;
}
import * as Lantern from '../lantern.js';
//# sourceMappingURL=SpeedIndex.d.ts.map