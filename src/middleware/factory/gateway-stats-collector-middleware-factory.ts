import {Middleware} from "../middleware";
import {GatewayHostService} from "../../service/gateway-host-service";
import {GatewayStatsCollectorMiddleware} from "../gateway-stats-collector-middleware";
import {MiddlewareRegistry} from "../middleware-registry";
import {MiddlewareAbstractFactory} from "./middleware-abstract-factory";

export class GatewayStatsCollectorMiddlewareFactory extends MiddlewareAbstractFactory implements Middleware {

    private readonly _domain: string;

    constructor(args: { domain: string }) {
        super();
        this._domain = args.domain;
    }

    build(service: GatewayHostService) {
        return new GatewayStatsCollectorMiddleware(this._domain, service);
    }

    serialize(): any {
        return {type: MiddlewareRegistry.GatewayStatsCollector, args: {}};
    }

    equals(other: any): boolean {
        return !!(other && other instanceof GatewayStatsCollectorMiddleware);
    }

    toString() {
        return MiddlewareRegistry.GatewayStatsCollector;
    }
}
