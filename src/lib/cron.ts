/**
 * Every /api/cron/* route calls this first. Vercel Cron sends a fixed
 * `Authorization: Bearer <CRON_SECRET>` header (configured in vercel.json);
 * anyone else hitting the route without that header gets a 401, so cron
 * routes can stay unauthenticated (no user session) without being an open
 * write endpoint.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization');
  return header === `Bearer ${secret}`;
}
