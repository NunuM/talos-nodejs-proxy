import {ProxyError} from "./proxy-error";

export class GatewayNotFoundError extends ProxyError {

    constructor(message: string) {
        super(message);
    }


    toResponse() {
        return {
            status: 200,
            headers: {},
        }
    }
}
