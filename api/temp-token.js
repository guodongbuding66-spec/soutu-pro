import { issueSignedToken, presignUrl } from '@vercel/blob';

const MAX_BYTES = 20 * 1024 * 1024;

const TEST_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

async function authConfig() {
  const hasStaticToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  const hasOidc = !!process.env.VERCEL_OIDC_TOKEN && !!process.env.BLOB_STORE_ID;
  return {
    hasStaticToken,
    hasOidc,
    auth: hasStaticToken
      ? { token: process.env.BLOB_READ_WRITE_TOKEN }
      : hasOidc
        ? { oidcToken: process.env.VERCEL_OIDC_TOKEN, storeId: process.env.BLOB_STORE_ID }
        : null,
  };
}

async function buildSignedUrls({ pathname, contentType, size, ttlMinutes, auth }) {
  const now = Date.now();
  const expiresAt = now + ttlMinutes * 60_000;
  const token = await issueSignedToken({
    ...auth,
    pathname,
    operations: ['put', 'get', 'delete'],
    validUntil: expiresAt + 24 * 60 * 60_000,
    allowedContentTypes: [contentType],
    maximumSizeInBytes: Math.max(size || 0, 1024),
  });
  const upload = await presignUrl(token, {
    pathname,
    operation: 'put',
    access: 'private',
    validUntil: now + 10 * 60_000,
    allowedContentTypes: [contentType],
    maximumSizeInBytes: Math.max(size || 0, 1024),
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
  return { uploadUrl: upload.presignedUrl, url: read.presignedUrl, deleteUrl: remove.presignedUrl, expiresAt };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const cfg = await authConfig();
    if (!cfg.auth) return res.status(503).json({ configured:false, code:'BLOB_NOT_CONFIGURED' });
    if (String(req.query?.selftest || '') !== '1') {
      return res.status(200).json({ configured:true, authMode:cfg.hasStaticToken?'token':'oidc', storeIdPresent:!!process.env.BLOB_STORE_ID });
    }
    try {
      const pathname=`health/${Date.now()}-${crypto.randomUUID()}.png`;
      const signed=await buildSignedUrls({pathname,contentType:'image/png',size:TEST_PNG.length,ttlMinutes:5,auth:cfg.auth});
      const putRes=await fetch(signed.uploadUrl,{method:'PUT',headers:{'content-type':'image/png'},body:TEST_PNG});
      if(!putRes.ok) throw new Error(`PUT failed (${putRes.status})`);
      const getRes=await fetch(signed.url,{cache:'no-store'});
      if(!getRes.ok) throw new Error(`GET failed (${getRes.status})`);
      const bytes=Buffer.from(await getRes.arrayBuffer());
      const delRes=await fetch(signed.deleteUrl,{method:'DELETE'});
      if(!delRes.ok) throw new Error(`DELETE failed (${delRes.status})`);
      return res.status(200).json({configured:true,authMode:cfg.hasStaticToken?'token':'oidc',signedUrls:true,put:true,get:true,delete:true,bytes:bytes.length});
    } catch (error) {
      return res.status(500).json({configured:true,selftest:false,error:error?.message||'Blob self-test failed'});
    }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ttl = Math.min(120, Math.max(5, Number(req.query?.ttl || 30)));
    const size = Number(req.query?.size || 0);
    const contentType = String(req.query?.contentType || 'image/png');
    if (size && size > MAX_BYTES) return res.status(413).json({ error: 'Image exceeds 20 MB limit' });
    if (!contentType.startsWith('image/')) return res.status(415).json({ error: 'Only image uploads are allowed' });

    const cfg = await authConfig();
    if (!cfg.auth) {
      return res.status(503).json({
        code: 'BLOB_NOT_CONFIGURED',
        error: 'Vercel Blob store is not connected to this project',
      });
    }

    const expiresAt = Date.now() + ttl * 60_000;
    const pathname = `temp/${expiresAt}-${crypto.randomUUID()}`;
    const signed = await buildSignedUrls({ pathname, contentType, size: Math.max(size, 1), ttlMinutes: ttl, auth: cfg.auth });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      provider: 'vercel-blob',
      uploadUrl: signed.uploadUrl,
      url: signed.url,
      deleteUrl: signed.deleteUrl,
      expiresAt: signed.expiresAt,
      pathname,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Unable to create signed Blob URLs' });
  }
}