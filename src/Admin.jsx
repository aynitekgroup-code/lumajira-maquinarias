import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;

export default function Admin() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState('');
  const [draft, setDraft] = useState('');
  const [prospect, setProspect] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session)).finally(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  async function request(action, text, confirm = false) {
    setBusy(true); setMessage('');
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) throw new Error('Tu sesión ha terminado. Solicita un nuevo enlace.');
      const response = await fetch(`/api/admin?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentSession.access_token}` }, body: JSON.stringify({ text, confirm }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
      return data;
    } catch (error) { setMessage(error.message); return null; }
    finally { setBusy(false); }
  }

  async function generate() { const data = await request('draft', topic); if (data) setDraft(data.text); }
  async function analyze() { setAnalysis(''); setContactMessage(''); const data = await request('prospect', prospect); if (data) { setAnalysis(data.text.analisis); setContactMessage(data.text.mensaje); } }
  async function copyMessage() {
    try { await navigator.clipboard.writeText(contactMessage); setMessage('Mensaje copiado. Revísalo antes de enviarlo.'); }
    catch { setMessage('No se pudo copiar automáticamente. Selecciona el mensaje y cópialo.'); }
  }
  async function publish() {
    if (!window.confirm('¿Publicar ahora el texto mostrado en la página de LinkedIn de LumaControl?')) return;
    const data = await request('publish', draft, true);
    if (data) { setMessage('LinkedIn confirmó la publicación.'); setDraft(''); }
  }
  async function login() {
    if (!supabase) { setMessage('Falta configurar Supabase en Vercel.'); return; }
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.signInWithOtp({ email: 'aynitek.group@gmail.com', options: { shouldCreateUser: false, emailRedirectTo: 'https://lumajirahub.com/admin' } });
    setBusy(false);
    setMessage(error ? 'No se pudo enviar el enlace. Verifica la configuración de Supabase y el usuario administrador.' : 'Revisa tu correo y abre el enlace de acceso en este mismo navegador.');
  }
  async function logout() { await supabase.auth.signOut(); setSession(null); }

  return <main className="admin"><a href="/" className="admin-back">← Volver al sitio</a><p className="eyebrow"><span /> PANEL PRIVADO</p><h1>Agente de LinkedIn</h1><p className="admin-intro">Contenido y prospección para LumaControl. Tú decides qué publicar.</p>
    {loading ? <p>Comprobando acceso…</p> : !session ? <section className="admin-card"><h2>Acceso de administrador</h2><p>Enviaremos un enlace a la cuenta autorizada: aynitek.group@gmail.com.</p><button type="button" className="primary admin-action" onClick={login} disabled={busy}>Enviar enlace de acceso</button><p>Abre el enlace desde este mismo navegador.</p></section> : <><div className="admin-session"><span>{session.user.email}</span><button type="button" onClick={logout}>Cerrar sesión</button></div><section className="admin-card"><h2>Crear publicación</h2><label htmlFor="topic">¿Sobre qué quieres publicar?</label><textarea id="topic" value={topic} onChange={e => setTopic(e.target.value)} maxLength={1000} placeholder="Ej. Beneficios de conectar máquinas en una fábrica mediana"/><button type="button" className="primary admin-action" onClick={generate} disabled={busy || !topic.trim()}>Generar borrador</button><label htmlFor="draft">Revisa y edita el borrador</label><textarea id="draft" value={draft} onChange={e => setDraft(e.target.value)} maxLength={3000} rows={10} placeholder="El borrador aparecerá aquí."/><small>{draft.length}/3000 · No se guarda automáticamente.</small><button type="button" className="primary admin-action" onClick={publish} disabled={busy || !draft.trim()}>Aprobar y publicar en LinkedIn</button><p>La publicación requiere que LinkedIn haya concedido los permisos necesarios.</p></section><section className="admin-card"><h2>Analizar un prospecto</h2><p>Introduce información que hayas verificado. No incluyas datos sensibles.</p><label htmlFor="prospect">Empresa, cargo y contexto</label><textarea id="prospect" value={prospect} onChange={e => setProspect(e.target.value)} maxLength={2000} placeholder="Ej. Empresa industrial mediana en Lima; contacto: gerente de planta"/><button type="button" className="primary admin-action" onClick={analyze} disabled={busy || !prospect.trim()}>Analizar y redactar mensajes</button>{analysis && <><div className="admin-result"><strong>Análisis breve</strong><p>{analysis}</p></div><label htmlFor="contact-message">Mensaje para revisar y editar</label><textarea id="contact-message" rows={6} value={contactMessage} onChange={e => setContactMessage(e.target.value)} /><button type="button" className="primary admin-action" onClick={copyMessage} disabled={!contactMessage.trim()}>Copiar mensaje</button></>}<p>Esta herramienta no busca perfiles ni envía solicitudes o mensajes.</p></section></>}
    {message && <p role="status" className="admin-message">{message}</p>}
  </main>;
}
