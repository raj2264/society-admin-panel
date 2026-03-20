/**
 * Converts a Supabase storage public URL to a local proxy URL.
 * This prevents the Supabase domain from being exposed to end users.
 *
 * Example:
 * Input:  https://xxx.supabase.co/storage/v1/object/public/maintenance-bills/bills/123.pdf
 * Output: /api/storage/maintenance-bills/bills/123.pdf
 */
export function toProxyUrl(supabaseUrl: string | null | undefined): string {
  if (!supabaseUrl) return '';

  // Match Supabase storage URL pattern (public or signed)
  const match = supabaseUrl.match(
    /\/storage\/v1\/object\/(?:public|sign)\/(.+?)(?:\?.*)?$/
  );

  if (match) {
    return `/api/storage/${match[1]}`;
  }

  // Already a proxy URL or not a Supabase URL
  return supabaseUrl;
}

/**
 * Builds a full absolute proxy URL (for use in emails or external links).
 * Requires NEXT_PUBLIC_SITE_URL env var to be set.
 */
export function toFullProxyUrl(supabaseUrl: string | null | undefined): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  return baseUrl + toProxyUrl(supabaseUrl);
}

/**
 * Builds a proxy URL from bucket name and file path.
 */
export function buildProxyUrl(bucket: string, path: string): string {
  return `/api/storage/${bucket}/${path}`;
}
