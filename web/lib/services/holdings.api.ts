/**
 * Holdings API service
 *
 * Fetches the authenticated user's metal portfolio from the backend.
 * Auth is handled via the httpOnly JWT cookie (sent automatically by the browser).
 */

const baseUrl =
  process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4000';

export interface MetalHolding {
  amountGrams: number;
  updatedAt: string | null;
}

export interface HoldingsResponse {
  success: boolean;
  data?: {
    gold: MetalHolding;
    silver: MetalHolding;
    platinum: MetalHolding;
  };
  message?: string;
}

export const fetchHoldingsApi = async (): Promise<HoldingsResponse> => {
  try {
    const res = await fetch(`${baseUrl}/api/holdings`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Send the httpOnly JWT cookie with the request
      credentials: 'include',
    });

    const json = await res.json();

    if (!res.ok) {
      return { success: false, message: json?.message ?? 'Failed to fetch holdings' };
    }

    return json as HoldingsResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    return { success: false, message };
  }
};
