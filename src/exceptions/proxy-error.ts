export abstract class ProxyError extends Error {
    abstract toResponse(): { status: number, headers: any };
}
