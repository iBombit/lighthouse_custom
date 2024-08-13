export type Node = import('../BaseNode.js').Node;
/** @typedef {import('../BaseNode.js').Node} Node */
export class TotalBlockingTime extends Lantern.Metric {
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
     * @param {number} minDurationMs
     */
    static getTopLevelEvents(nodeTimings: Lantern.Simulation.Result['nodeTimings'], minDurationMs: number): {
        start: number;
        end: number;
        duration: number;
    }[];
}
import * as Lantern from '../lantern.js';
//# sourceMappingURL=TotalBlockingTime.d.ts.map