import { del, list } from '@vercel/blob';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const secret = process.env.CRON_SECRET;
  const auth = String(req.headers?.authorization || '');
  const schedule = String(req.headers?.['x-vercel-cron-schedule'] || '');
  const authorized = secret ? auth === `Bearer ${secret}` : schedule === '0 3 * * *';
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const now = Date.now();
    let cursor;
    let deleted = 0;
    do {
      const page = await list({ prefix: 'temp/', cursor, limit: 1000 });
      const expired = page.blobs.filter(blob => {
        const name = blob.pathname.split('/').pop() || '';
        const expiry = Number(name.split('-')[0]);
        return Number.isFinite(expiry) && expiry < now;
      });
      if (expired.length) {
        await del(expired.map(x => x.url));
        deleted += expired.length;
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, deleted });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Cleanup failed' });
  }
}