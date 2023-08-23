import {LoadBalancer} from "./load-balancer";
import {UpstreamHost} from "../model/upstream-host";
import {LoadBalancerType} from "./load-balancer-type";


/**
 * @class
 * @extends {LoadBalancer}
 */
export class RoundRobinLoadBalancer implements LoadBalancer {

    private _currentIdx: number;

    /**
     * @constructor
     */
    constructor() {
        this._currentIdx = 0;
    }

    get currentIdx(): number {
        return this._currentIdx;
    }

    set currentIdx(value: number) {
        this._currentIdx = value;
    }

    get type(): LoadBalancerType {
        return LoadBalancerType.RoundRobin;
    }

    /**
     * @inheritDoc
     */
    nextHost(upstreams: UpstreamHost[]): UpstreamHost | undefined {

        if (upstreams.length <= 1) {
            return upstreams.find((h) => h.isOnline);
        }

        let upstream: UpstreamHost;
        let previous: UpstreamHost;

        const iterator: Iterator<UpstreamHost> = new IndexedUpstreamIterator(this, upstreams);

        if (this._currentIdx === 0) {

            previous = upstreams[upstreams.length - 1];

        } else {

            previous = upstreams[this._currentIdx - 1];

        }

        do {

            upstream = iterator.next().value;

            if (upstream.isOnline) {
                return upstream;
            }

        } while (upstream != previous);


        return previous.isOnline ? previous : undefined;
    }


}


class IndexedUpstreamIterator implements Iterator<UpstreamHost> {

    private _lb: RoundRobinLoadBalancer;
    private readonly _upstreams: UpstreamHost[]

    constructor(lb: RoundRobinLoadBalancer, upstreams: UpstreamHost[]) {
        this._lb = lb;
        this._upstreams = upstreams;
    }

    next(...args: [] | [undefined]): IteratorResult<UpstreamHost, any> {
        if (this._lb.currentIdx === this._upstreams.length) {
            this._lb.currentIdx = 0;
        }

        if (this._lb.currentIdx < this._upstreams.length) {
            return {
                value: this._upstreams[this._lb.currentIdx++],
                done: false
            };
        } else {
            return {
                value: undefined,
                done: true
            }
        }
    }
}
