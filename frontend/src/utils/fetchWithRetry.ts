/**
 * Utility function to fetch with retry logic
 * Retries 10 times with 1.5s interval on failure
 */

const MAX_RETRIES = 10;
const RETRY_DELAY = 1500; // 1.5 seconds

export interface FetchWithRetryOptions extends RequestInit {
    maxRetries?: number;
    retryDelay?: number;
}

export async function fetchWithRetry(
    url: string,
    options: FetchWithRetryOptions = {}
): Promise<Response> {
    const maxRetries = options.maxRetries ?? MAX_RETRIES;
    const retryDelay = options.retryDelay ?? RETRY_DELAY;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            // If response is a server error (5xx), retry
            if (response.status >= 500) {
                console.warn(`[fetchWithRetry] Server error ${response.status} for ${url}, retrying in ${retryDelay}ms... (${attempt}/${maxRetries})`);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }
            }

            return response;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.warn(`[fetchWithRetry] Request failed for ${url}: ${lastError.message}, retrying in ${retryDelay}ms... (${attempt}/${maxRetries})`);

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }

    throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}

/**
 * Helper to fetch JSON with retry
 */
export async function fetchJsonWithRetry<T>(
    url: string,
    options: FetchWithRetryOptions = {}
): Promise<T> {
    const response = await fetchWithRetry(url, options);
    return response.json();
}

export default fetchWithRetry;
