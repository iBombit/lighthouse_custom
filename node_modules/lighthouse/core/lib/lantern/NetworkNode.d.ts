/**
 * @template [T=any]
 * @extends {Lantern.BaseNode<T>}
 */
export class NetworkNode<T = any> extends Lantern.BaseNode<T> {
    /**
     * @param {Lantern.NetworkRequest<T>} networkRequest
     */
    constructor(networkRequest: Lantern.NetworkRequest<T>);
    /** @private */
    private _request;
    get type(): "network";
    /**
     * @return {Readonly<T>}
     */
    get rawRequest(): Readonly<T>;
    /**
     * @return {Lantern.NetworkRequest<T>}
     */
    get request(): Lantern.NetworkRequest<T>;
    /**
     * @return {string}
     */
    get initiatorType(): string;
    /**
     * @return {boolean}
     */
    get fromDiskCache(): boolean;
    /**
     * @return {boolean}
     */
    get isNonNetworkProtocol(): boolean;
    /**
     * Returns whether this network request can be downloaded without a TCP connection.
     * During simulation we treat data coming in over a network connection separately from on-device data.
     * @return {boolean}
     */
    get isConnectionless(): boolean;
    /**
     * @return {boolean}
     */
    hasRenderBlockingPriority(): boolean;
    /**
     * @return {NetworkNode<T>}
     */
    cloneWithoutRelationships(): NetworkNode<T>;
}
import * as Lantern from './lantern.js';
//# sourceMappingURL=NetworkNode.d.ts.map