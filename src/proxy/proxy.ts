import {ServerRequest} from "../model/request";
import {ServerResponse} from "../model/response";


// This interface defines the contract for a Proxy object.
export interface Proxy {

    /**
     * This method starts the proxy server and specifies a handler function to process incoming requests.
     * It takes a callback function that will be called for each incoming request, providing the request and response objects.
     * The handler function is responsible for processing the request and generating the appropriate response.
     * @param handler
     */
    start(handler: (request: ServerRequest, response: ServerResponse) => void): void;

    /**
     * This method shuts down the proxy server and returns a promise indicating whether the operation was successful.
     * It is used to gracefully close the proxy server and release any associated resources.
     */
    close(): Promise<boolean>;
}
