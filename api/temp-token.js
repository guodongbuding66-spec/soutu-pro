import { issueSignedToken, presignUrl } from '@vercel/blob';

const MAX_BYTES = 20 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ttl = Math.min(120, Math.max(5, Number(req.query?.ttl || 30)));
    const size = Number(req.query?.size || 0);
    const contentType = String(req.query?.contentType || 'image/png');
    if (size && size > MAX_BYTES) return res.status(413).json({ error: 'Image exceeds 20 MB limit' });
    if (!contentType.startsWith('image/')) return res.status(415).json({ error: 'Only image uploads are allowed' });

    const now = Date.now();
    const expiresAt = now + ttl * 60_000;
    const pathname = `temp/${expiresAt}-${crypto.randomUUID()}`;
    const token = await issueSignedToken({
      pathname,
      operations: ['put', 'get', 'delete'],
      validUntil: expiresAt + 24 * 60 * 60_000,
      allowedContentTypes: [contentType],
      maximumSizeInBytes: MAX_BYTES,
    });
    const upload = await presignUrl(token, {
      pathname,
      operation: 'put',
      access: 'private',
      validUntil: now + 10 * 60_000,
      allowedContentTypes: [contentType],
      maximumSizeInBytes: MAX_BYTES,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    const read = await presignUrl(token, {
      pathname,
      operation: 'get',
      access: 'private',
      validUntil: expiresAt,
      useCache: false,
    });
    const remove = await presignUrl(token, {
      pathname,
      operation: 'delete',
      access: 'private',
      validUntil: expiresAt + 24 * 60 * 60_000,
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      provider: 'vercel-blob',
      uploadUrl: upload.presignedUrl,
      url: read.presignedUrl,
      deleteUrl: remove.presignedUrl,
      expiresAt,
      pathname,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Unable to create signed Blob URLs' });
  }
}