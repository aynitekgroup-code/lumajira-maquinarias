const crypto = require('node:crypto');
const { draftPost, publishPost } = require('../server/linkedin-agent');
const { analyzeProspect } = require('../server/linkedin-prospect');

const BASE = 'https://www.lumajirahub.com';
const EMAIL = 'aynitek.group@gmail.com';
const CALLBACK = `${BASE}/api/admin?action=callback`;
const cookieOptions = 'HttpOnly; Secure; SameSite=Lax; Path=/';

function cookie(req, name) {
  const part = (req.headers.cookie || '').split('; ').find(item => item.startsWith(`${name}=`));
  return part ? part.slice(name.length + 1) : '';
}
function sign(value) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(value).digest('base64url');
}
function validSession(req) {
  const [payload, signature] = cookie(req, 'luma_session').split('.');
  if (!payload || !signature || !process.env.SESSION_SECRET) return false;
  const expected = sign(payload);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.email === EMAIL && data.exp > Date.now();
  } catch { return false; }
}
function end(res, status, body) { return res.status(status).json(body); }

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const action = req.query.action;
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) return end(res, 503, { error: 'Falta configurar SESSION_SECRET en el servidor.' });
  try {
    if (action === 'login' && req.method === 'GET') {
      if (!process.env.GOOGLE_CLIENT_ID) return end(res, 503, { error: 'Falta configurar el acceso de Google.' });
      const state = crypto.randomBytes(32).toString('base64url');
      res.setHeader('Set-Cookie', `luma_oauth=${state}; ${cookieOptions}; Max-Age=600`);
      const params = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: CALLBACK, response_type: 'code', scope: 'openid email', state, prompt: 'select_account' });
      return res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    }
    if (action === 'callback' && req.method === 'GET') {
      const state = cookie(req, 'luma_oauth');
      res.setHeader('Set-Cookie', `luma_oauth=; ${cookieOptions}; Max-Age=0`);
      if (!state || typeof req.query.state !== 'string' || state !== req.query.state || typeof req.query.code !== 'string') return end(res, 400, { error: 'La sesión de acceso ha expirado. Inténtalo de nuevo.' });
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: req.query.code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: CALLBACK, grant_type: 'authorization_code' }) });
      if (!tokenResponse.ok) return end(res, 401, { error: 'No se pudo verificar el acceso con Google.' });
      const token = await tokenResponse.json();
      const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } });
      if (!userResponse.ok) return end(res, 401, { error: 'No se pudo verificar la cuenta de Google.' });
      const user = await userResponse.json();
      if (user.email !== EMAIL || user.email_verified !== true) return end(res, 403, { error: 'Esta cuenta no tiene acceso al panel.' });
      const payload = Buffer.from(JSON.stringify({ email: EMAIL, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
      res.setHeader('Set-Cookie', [`luma_oauth=; ${cookieOptions}; Max-Age=0`, `luma_session=${payload}.${sign(payload)}; ${cookieOptions}; Max-Age=28800`]);
      return res.redirect(302, '/admin');
    }
    if (!validSession(req)) return end(res, 401, { error: 'Inicia sesión con la cuenta autorizada.' });
    if (action === 'session' && req.method === 'GET') return end(res, 200, { email: EMAIL });
    if (req.method !== 'POST' || req.headers.origin !== BASE) return end(res, 403, { error: 'Solicitud no autorizada.' });
    if (action === 'logout') {
      res.setHeader('Set-Cookie', `luma_session=; ${cookieOptions}; Max-Age=0`);
      return end(res, 200, { ok: true });
    }
    const value = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!value || value.length > (action === 'publish' ? 3000 : 2000)) return end(res, 400, { error: 'El texto está vacío o supera el límite permitido.' });
    if (action === 'draft') return end(res, 200, { text: await draftPost(value) });
    if (action === 'prospect') return end(res, 200, { text: await analyzeProspect(value) });
    if (action === 'publish') {
      if (req.body.confirm !== true) return end(res, 400, { error: 'Debes confirmar la publicación.' });
      const id = await publishPost(value);
      return end(res, 200, { id: id || null });
    }
    return end(res, 404, { error: 'Acción desconocida.' });
  } catch (error) {
    console.error('Admin action failed:', error.message);
    return end(res, 500, { error: 'No se pudo completar la operación. Revisa la configuración y los permisos del servidor.' });
  }
};
