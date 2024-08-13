export type Node = import('../BaseNode.js').Node;
export class Interactive extends Lantern.Metric {
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
     * @param {Lantern.Simulation.Result['nodeTimings']} nodeTimings
     * @return {number}
     */
    static getLastLongTaskEndTime(nodeTimings: Lantern.Simulation.Result['nodeTimings'], duration?: number): number;
}
import * as Lantern from '../lantern.js';
//# sourceMappingURL=Interactive.d.ts.map