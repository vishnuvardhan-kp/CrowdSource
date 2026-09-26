import { Platform } from 'react-native';
import { config } from '../constants/config';
import { storage } from '../utils/storage';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let activeToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  activeToken = token;
}

export async function getApiAuthToken(): Promise<string | null> {
  if (activeToken) return activeToken;
  const stored = await storage.getItem(config.storageKeys.authToken);
  if (stored) {
    activeToken = stored;
  }
  return activeToken;
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Executes a multipart FormData upload using React Native's native XMLHttpRequest.
 *
 * Expo 57's experimental Winter `fetch` polyfill throws "Unsupported FormDataPart implementation"
 * when given standard React Native `{ uri, name, type }` FormData parts.
 * React Native's XMLHttpRequest connects directly to RCTNetworking and Android OkHttp MultipartBody,
 * which natively streams files from content/file URIs with automatic boundary calculation.
 */
/**
 * Executes an HTTP request on native platforms using React Native's native XMLHttpRequest.
 *
 * This completely avoids Expo SDK 57's experimental Winter `fetch` runtime, which suffers from:
 * 1. "Unsupported FormDataPart implementation" on native `{ uri, name, type }` FormData parts.
 * 2. Unexplained "Failed to fetch" errors on cleartext HTTP POST requests with JSON bodies.
 *
 * React Native's XMLHttpRequest connects directly to RCTNetworking and OkHttp on Android,
 * providing rock-solid native transport, automatic multipart boundaries, and correct timeouts.
 */
function requestWithNativeXHR<T>(
  url: string,
  method: string,
  body: any,
  headers: Record<string, string>,
  timeoutMs: number,
  signal?: AbortSignal | null,
  retriesRemaining: number = 1,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const isFormData =
      typeof FormData !== 'undefined' &&
      (body instanceof FormData ||
        (body && typeof (body as any).getParts === 'function'));

    const startTs = Date.now();
    const cleanMethod = method.toUpperCase();
    console.log(`[ApiClient:XHR] >>> ${cleanMethod} ${url} (timeout: ${timeoutMs}ms)`);

    const xhr = new XMLHttpRequest();
    xhr.open(cleanMethod, url);
    xhr.timeout = timeoutMs;

    // Set headers (exclude Content-Type for FormData so OkHttp generates multipart boundary)
    for (const [key, value] of Object.entries(headers)) {
      if (isFormData && key.toLowerCase() === 'content-type') {
        continue;
      }
      if (value !== undefined && value !== null) {
        xhr.setRequestHeader(key, value);
      }
    }

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        reject(new ApiError('Request was aborted.', 499));
        return;
      }
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new ApiError('Request was aborted.', 499));
      });
    }

    xhr.onload = () => {
      const elapsed = Date.now() - startTs;
      let responseData: any = null;
      const responseContentType = xhr.getResponseHeader('content-type') || '';

      if (
        responseContentType.includes('application/json') ||
        (xhr.responseText && xhr.responseText.trim().startsWith('{'))
      ) {
        try {
          responseData = JSON.parse(xhr.responseText);
        } catch {
          responseData = xhr.responseText;
        }
      } else {
        responseData = xhr.responseText;
      }

      console.log(`[ApiClient:XHR] <<< ${cleanMethod} ${url} status=${xhr.status} in ${elapsed}ms`);

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(responseData as T);
      } else {
        const errorMessage =
          (responseData &&
            (Array.isArray(responseData.message)
              ? responseData.message.join(', ')
              : responseData.message)) ||
          xhr.statusText ||
          `Request failed with HTTP status ${xhr.status}`;

        console.warn(`[ApiClient:XHR] Server returned HTTP ${xhr.status}:`, errorMessage);
        reject(new ApiError(errorMessage, xhr.status, responseData));
      }
    };

    xhr.onerror = (e) => {
      const elapsed = Date.now() - startTs;
      console.error(
        `[ApiClient:XHR] !!! Network Error on ${cleanMethod} ${url} after ${elapsed}ms:`,
        e,
      );
      if (retriesRemaining > 0 && (!signal || !signal.aborted)) {
        console.log(
          `[ApiClient:XHR] Retrying ${cleanMethod} ${url} with fresh connection (${retriesRemaining} retry left)...`,
        );
        setTimeout(() => {
          requestWithNativeXHR<T>(
            url,
            method,
            body,
            headers,
            timeoutMs,
            signal,
            retriesRemaining - 1,
          )
            .then(resolve)
            .catch(reject);
        }, 150);
        return;
      }
      reject(
        new ApiError(
          `Unable to connect to server at ${url}. Please check your connection.`,
          0,
        ),
      );
    };

    xhr.ontimeout = () => {
      const elapsed = Date.now() - startTs;
      console.error(
        `[ApiClient:XHR] !!! Request Timed Out on ${cleanMethod} ${url} after ${elapsed}ms (limit: ${timeoutMs}ms)`,
      );
      reject(
        new ApiError(
          `Request to ${url} timed out after ${(timeoutMs / 1000).toFixed(0)}s. Please try again.`,
          408,
        ),
      );
    };

    xhr.onabort = () => {
      console.log(`[ApiClient:XHR] Request to ${url} was aborted.`);
      reject(new ApiError('Request was aborted.', 499));
    };

    try {
      if (body) {
        xhr.send(body);
      } else {
        xhr.send();
      }
    } catch (sendErr: any) {
      console.error(`[ApiClient:XHR] Failed to send request to ${url}:`, sendErr);
      if (retriesRemaining > 0 && (!signal || !signal.aborted)) {
        console.log(
          `[ApiClient:XHR] Retrying failed send to ${url} (${retriesRemaining} retry left)...`,
        );
        setTimeout(() => {
          requestWithNativeXHR<T>(
            url,
            method,
            body,
            headers,
            timeoutMs,
            signal,
            retriesRemaining - 1,
          )
            .then(resolve)
            .catch(reject);
        }, 150);
        return;
      }
      reject(new ApiError(sendErr.message || 'Failed to dispatch request', 0));
    }
  });
}

/**
 * Dedicated helper for multipart file uploads.
 */
export async function uploadFormData<T>(
  endpoint: string,
  formData: FormData,
  options: Omit<RequestOptions, 'body'> = {},
): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: options.method || 'POST',
    body: formData,
  });
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = await getApiAuthToken();
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${config.apiBaseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const isFormData =
    typeof FormData !== 'undefined' &&
    (options.body instanceof FormData ||
      (options.body && typeof (options.body as any).getParts === 'function'));

  const timeoutMs = options.timeoutMs || config.requestTimeoutMs;

  // If not FormData and sending a body without explicit Content-Type, default to JSON
  if (!isFormData && options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // On native mobile (iOS/Android), route ALL requests via native XMLHttpRequest.
  // This completely eliminates Expo SDK 57's experimental Winter fetch polyfill,
  // resolving both "Unsupported FormDataPart implementation" and "Failed to fetch".
  if (Platform.OS !== 'web' && typeof XMLHttpRequest !== 'undefined') {
    return requestWithNativeXHR<T>(
      url,
      options.method || 'GET',
      options.body,
      headers,
      timeoutMs,
      options.signal,
    );
  }

  // Standard Web platform fetch
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    let responseData: any = null;

    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        (responseData &&
          (Array.isArray(responseData.message)
            ? responseData.message.join(', ')
            : responseData.message)) ||
        response.statusText ||
        'An error occurred communicating with the server.';

      throw new ApiError(errorMessage, response.status, responseData);
    }

    return responseData as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. Please verify your connection and try again.',
        408,
      );
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      error.message || 'Network request failed. Please check your internet connection.',
      0,
    );
  }
}

