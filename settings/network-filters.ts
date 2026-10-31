/**
 * Request classification shared by the XHR audits and the request-bodies gatherer
 * (previously copy-pasted into each of them).
 */

/** URL fragments of static resources; such requests are never treated as XHR. */
export const STATIC_RESOURCE_EXTENSIONS: readonly string[] = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map', '.webp'];

/** Advertising and tracking URL fragments; such requests are never treated as XHR. */
export const AD_URL_PATTERNS: readonly string[] = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'facebook.com/tr', 'google-analytics.com', '/ads?', '/ad?',
    'adsystem.com', 'adnxs.com', 'amazon-adsystem.com'
];

/** API-like URL fragments. */
export const API_URL_PATTERNS: readonly string[] = ['/api/', '/ajax/', '/xhr/', '/rest/', '/graphql', '/json', '/data/'];

/** MIME type prefixes of static resources. `text/html` is usually a document, not XHR. */
const STATIC_MIME_TYPE_PREFIXES: readonly string[] = [
    'text/css', 'text/javascript', 'application/javascript',
    'image/', 'font/', 'audio/', 'video/',
    'text/html'
];

/** MIME types that mark a `Fetch` request as an API call. */
const API_MIME_TYPES: readonly string[] = ['application/json', 'application/xml', 'text/xml'];

/** The network record fields used to classify a request. */
export interface ClassifiableRequest {
    url: string;
    resourceType?: string;
    mimeType?: string;
    requestMethod?: string;
}

/**
 * Whether a recorded network request is an XHR/Fetch API call, excluding static
 * resources and ad/tracking requests. Used by `network-xhr-audit` and `xhr-count-audit`.
 */
export function isXHRRequest(record: ClassifiableRequest): boolean {
    // Check if it's an XHR/Fetch request by examining various indicators
    const resourceType = record.resourceType;
    const mimeType = record.mimeType || '';
    const url = record.url.toLowerCase();

    // First exclude obvious non-XHR requests
    // Exclude static resources by extension
    const isStaticResource = STATIC_RESOURCE_EXTENSIONS.some(ext => url.includes(ext));

    if (isStaticResource) {
        return false;
    }

    // Exclude common static resource MIME types
    if (STATIC_MIME_TYPE_PREFIXES.some(type => mimeType.startsWith(type))) {
        return false;
    }

    // Exclude advertising and tracking requests (common patterns)
    if (AD_URL_PATTERNS.some(pattern => url.includes(pattern))) {
        return false;
    }

    // XHR/Fetch requests typically have these characteristics:
    // 1. Resource type is 'XHR' or 'Fetch'
    // 2. MIME type contains 'json', 'xml' for APIs
    // 3. Not a static resource or ad request

    if (resourceType === 'XHR') {
        return true; // XHR is almost always what we want
    }

    if (resourceType === 'Fetch') {
        // For Fetch requests, be more selective about MIME types
        if (API_MIME_TYPES.some(type => mimeType.includes(type))) {
            return true;
        }

        // Check for API-like URL patterns for Fetch requests
        if (API_URL_PATTERNS.some(pattern => url.includes(pattern))) {
            return true;
        }

        // If it has a method other than GET and looks like an API call, it's likely XHR
        if (record.requestMethod && record.requestMethod !== 'GET') {
            return true;
        }
    }

    return false;
}
