import {ProxyError} from "./proxy-error";


export class UpstreamHostNotFound extends ProxyError {

    constructor(message: string) {
        super(message);
    }

    toResponse() {
        return {
            status: 500,
            headers: {}
        };
    }

}
