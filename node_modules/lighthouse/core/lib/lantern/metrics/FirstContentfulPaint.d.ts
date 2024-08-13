export type Node = import('../BaseNode.js').Node;
export type NetworkNode<T> = import('../NetworkNode.js').NetworkNode<T>;
export type CpuNode = import('../CpuNode.js').CPUNode;
/** @typedef {import('../BaseNode.js').Node} Node */
/** @template T @typedef {import('../NetworkNode.js').NetworkNode<T>} NetworkNode */
/** @typedef {import('../CpuNode.js').CPUNode} CpuNode */
export class FirstContentfulPaint extends Lantern.Metric {
    /**
     * @template T
     * @typedef FirstPaintBasedGraphOpts
     * @property {number} cutoffTimestamp The timestamp used to filter out tasks that occured after
     *    our paint of interest. Typically this is First Contentful Paint or First Meaningful Paint.
     * @property {function(NetworkNode<T>):boolean} treatNodeAsRenderBlocking The function that determines
     *    which resources should be considered *possibly* render-blocking.
     * @property {(function(CpuNode):boolean)=} additionalCpuNodesToTreatAsRenderBlocking The function that
     *    determines which CPU nodes should also be included in our blocking node IDs set,
     *    beyond what getRenderBlockingNodeData() already includes.
     */
    /**
     * This function computes the set of URLs that *appeared* to be render-blocking based on our filter,
     * *but definitely were not* render-blocking based on the timing of their EvaluateScript task.
     * It also computes the set of corresponding CPU node ids that were needed for the paint at the
     * given timestamp.
     *
     * @template [T=unknown]
     * @param {Node} graph
     * @param {FirstPaintBasedGraphOpts<T>} opts
     * @return {{definitelyNotRenderBlockingScriptUrls: Set<string>, renderBlockingCpuNodeIds: Set<string>}}
     */
    static getRenderBlockingNodeData<T = unknown>(graph: Node, { cutoffTimestamp, treatNodeAsRenderBlocking, additionalCpuNodesToTreatAsRenderBlocking }: {
        /**
         * The timestamp used to filter out tasks that occured after
         * our paint of interest. Typically this is First Contentful Paint or First Meaningful Paint.
         */
        cutoffTimestamp: number;
        /**
         * The function that determines
         * which resources should be considered *possibly* render-blocking.
         */
        treatNodeAsRenderBlocking: (arg0: Lantern.NetworkNode<T>) => boolean;
        /**
         * The function that
         * determines which CPU nodes should also be included in our blocking node IDs set,
         * beyond what getRenderBlockingNodeData() already includes.
         */
        additionalCpuNodesToTreatAsRenderBlocking?: ((arg0: CpuNode) => boolean) | undefined;
    }): {
        definitelyNotRenderBlockingScriptUrls: Set<string>;
        renderBlockingCpuNodeIds: Set<string>;
    };
    /**
     * This function computes the graph required for the first paint of interest.
     *
     * @template [T=unknown]
     * @param {Node} dependencyGraph
     * @param {FirstPaintBasedGraphOpts<T>} opts
     * @return {Node}
     */
    static getFirstPaintBasedGraph<T_1 = unknown>(dependencyGraph: Node, { cutoffTimestamp, treatNodeAsRenderBlocking, additionalCpuNodesToTreatAsRenderBlocking }: {
        /**
         * The timestamp used to filter out tasks that occured after
         * our paint of interest. Typically this is First Contentful Paint or First Meaningful Paint.
         */
        cutoffTimestamp: number;
        /**
         * The function that determines
         * which resources should be considered *possibly* render-blocking.
         */
        treatNodeAsRenderBlocking: (arg0: Lantern.NetworkNode<T_1>) => boolean;
        /**
         * The function that
         * determines which CPU nodes should also be included in our blocking node IDs set,
         * beyond what getRenderBlockingNodeData() already includes.
         */
        additionalCpuNodesToTreatAsRenderBlocking?: ((arg0: CpuNode) => boolean) | undefined;
    }): Node;
}
import * as Lantern from '../lantern.js';
//# sourceMappingURL=FirstContentfulPaint.d.ts.map