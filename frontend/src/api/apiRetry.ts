/**
 * API Retry Utility
 * Provides consistent retry logic for fetch calls.
 * Retries up to 10 times on server errors (5xx) or network errors with 1.5s interval.
 */

interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 10,
    baseDelay: 1500,  // 1.5 second interval as requested
    maxDelay: 1500    // Fixed interval, not exponential
};

/**
 * Wraps a fetch call with retry logic.
 * Only retries on 5xx server errors.
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retryOptions: RetryOptions = {}
): Promise<Response> {
    const { maxRetries, baseDelay } = { ...DEFAULT_OPTIONS, ...retryOptions };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`API call attempt ${attempt}/${maxRetries}: ${url}`);
            const response = await fetch(url, options);

            // Only retry on server errors (5xx)
            if (response.status >= 500 && attempt < maxRetries) {
                const errorText = await response.text();
                console.warn(`Server error (${response.status}), retrying... Error: ${errorText.substring(0, 200)}`);

                // Fixed interval retry (1.5s)
                console.log(`Waiting ${baseDelay}ms before retry ${attempt + 1}...`);
                await new Promise(r => setTimeout(r, baseDelay));
                continue;
            }

            // Return response for non-5xx errors (let caller handle 4xx, etc.)
            return response;
        } catch (error: any) {
            lastError = error;
            console.error(`Network error on attempt ${attempt}:`, error.message);

            if (attempt < maxRetries) {
                console.log(`Waiting ${baseDelay}ms before retry ${attempt + 1}...`);
                await new Promise(r => setTimeout(r, baseDelay));
            }
        }
    }

    throw lastError || new Error(`Failed after ${maxRetries} attempts`);
}
