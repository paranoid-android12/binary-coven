/**
 * Wrapper around fetch for admin API calls.
 * Automatically redirects to login page on 401 Unauthorized responses.
 */
export async function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    // Clear any stale session state and redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
    throw new Error('Session expired. Redirecting to login...');
  }

  return response;
}
