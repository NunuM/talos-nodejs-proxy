import {ProxyError} from "./proxy-error";

export class UpstreamRequestTimeoutException extends ProxyError {

    constructor(message: string) {
        super(message);
    }

    toResponse(): { status: number; headers: any } {
        return {headers: undefined, status: 408};
    }

}
