const { draftPost, publishPost } = require('../server/linkedin-agent');
const { analyzeProspect } = require('../server/linkedin-prospect');
const { createClient } = require('@supabase/supabase-js');

const EMAIL = 'aynitek.group@gmail.com';
const BASE = 'https://lumajirahub.com';
function end(res, status, body) { return res.status(status).json(body); }

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const url = process.env.REACT_APP_SUPABASE_URL;
    const key = process.env.REACT_APP_SUPABASE_ANON_KEY;
    if (!url || !key) return end(res, 503, { error: 'Falta configurar Supabase en el servidor.' });
    const authorization = req.headers.authorization || '';
    if (!authorization.startsWith('Bearer ')) return end(res, 401, { error: 'Inicia sesión con la cuenta autorizada.' });
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data, error } = await client.auth.getUser(authorization.slice(7));
    if (error || !data.user || data.user.email?.toLowerCase() !== EMAIL || !data.user.email_confirmed_at) return end(res, 401, { error: 'Inicia sesión con la cuenta autorizada.' });
    const action = req.query.action;
    if (action === 'session' && req.method === 'GET') return end(res, 200, { email: EMAIL });
    if (req.method !== 'POST' || req.headers.origin !== BASE) return end(res, 403, { error: 'Solicitud no autorizada.' });
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
