/**
 * Types of load balancing policies
 *
 * @enum
 * @readonly
 * @type {{RR: number, FF: number}}
 */
import {LoadBalancer} from "./load-balancer";
import {FirstFreeLoadBalancer} from "./first-free-load-balancer";
import {RoundRobinLoadBalancer} from "./round-robin-load-balancer";

export enum LoadBalancerType {
    RoundRobin,
    FirstFree
}

export class LoadBalancerFactory {

    static getLoadBalancer(forType: LoadBalancerType): LoadBalancer {
        switch (forType) {
            case LoadBalancerType.FirstFree:
                return new FirstFreeLoadBalancer();
            case LoadBalancerType.RoundRobin:
                return new RoundRobinLoadBalancer();
            default:
                return new FirstFreeLoadBalancer();
        }
    }

}
