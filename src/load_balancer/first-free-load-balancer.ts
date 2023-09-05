/**
 * @class
 * @implements {LoadBalancer}
 */
import {LoadBalancer} from "./load-balancer";
import {LoadBalancerType} from "./load-balancer-type";
import {UpstreamHost} from "../model/upstream-host";


export class FirstFreeLoadBalancer implements LoadBalancer {

    get type(): LoadBalancerType {
        return LoadBalancerType.FirstFree;
    }

    /**
     * @inheritDoc
     */
    nextHost(upstreams: UpstreamHost[]): UpstreamHost | undefined {
        return upstreams.find((host) => host.isOnline);
    }
}
