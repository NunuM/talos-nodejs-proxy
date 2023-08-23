import {UpstreamHost} from "../model/upstream-host";
import {LoadBalancerType} from "./load-balancer-type";

/**
 * @interface
 */
export interface LoadBalancer {

    /**
     *
     */
    get type(): LoadBalancerType;

    /**
     * Retrieve next available host
     * @param {Array<UpstreamHost>} upstreams
     * @return {UpstreamHost|undefined}
     */
    nextHost(upstreams: UpstreamHost[]): UpstreamHost | undefined;
}
