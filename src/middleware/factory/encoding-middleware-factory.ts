import {MiddlewareAbstractFactory} from "./middleware-abstract-factory";
import {Middleware} from "../middleware";
import {GatewayHostService} from "../../service/gateway-host-service";
import {MiddlewareRegistry} from "../middleware-registry";
import {EncodingMiddleware} from "../encoding-middleware";

export class EncodingMiddlewareFactory extends MiddlewareAbstractFactory {

    build(service?: GatewayHostService): Middleware {
        return new EncodingMiddleware();
    }

    equals(other: any): boolean {
        return !!(other && other instanceof EncodingMiddleware);
    }

    serialize(): any {
        return {type: MiddlewareRegistry.ContentEncoding, args: {}};
    }

    toString() {
        return MiddlewareRegistry.ContentEncoding;
    }

}
