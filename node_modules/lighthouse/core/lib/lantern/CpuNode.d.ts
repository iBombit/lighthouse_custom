/**
 * @template [T=any]
 * @extends {Lantern.BaseNode<T>}
 */
export class CPUNode<T = any> extends Lantern.BaseNode<T> {
    /**
     * @param {Lantern.TraceEvent} parentEvent
     * @param {Lantern.TraceEvent[]=} childEvents
     * @param {number=} correctedEndTs
     */
    constructor(parentEvent: Lantern.TraceEvent, childEvents?: Lantern.TraceEvent[] | undefined, correctedEndTs?: number | undefined);
    _event: import("./types/lantern.js").TraceEvent;
    _childEvents: import("./types/lantern.js").TraceEvent[];
    _correctedEndTs: number | undefined;
    get type(): "cpu";
    /**
     * @return {number}
     */
    get duration(): number;
    /**
     * @return {Lantern.TraceEvent}
     */
    get event(): import("./types/lantern.js").TraceEvent;
    /**
     * @return {Lantern.TraceEvent[]}
     */
    get childEvents(): import("./types/lantern.js").TraceEvent[];
    /**
     * Returns true if this node contains a Layout task.
     * @return {boolean}
     */
    didPerformLayout(): boolean;
    /**
     * Returns the script URLs that had their EvaluateScript events occur in this task.
     */
    getEvaluateScriptURLs(): Set<string>;
    /**
     * @return {CPUNode}
     */
    cloneWithoutRelationships(): CPUNode;
}
import * as Lantern from './lantern.js';
//# sourceMappingURL=CpuNode.d.ts.map