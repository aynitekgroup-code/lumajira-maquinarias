import React, { useState } from 'react';

export default function MercadoLibreAgent({ request, busy, setMessage }) {
  const [details, setDetails] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [check, setCheck] = useState('');

  async function generate() {
    setTitle(''); setDescription(''); setCheck('');
    const data = await request('mercadolibre', details);
    if (data) { setTitle(data.text.titulo); setDescription(data.text.descripcion); setCheck(data.text.verificar); }
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); setMessage('Texto copiado. Revísalo antes de usarlo.'); }
    catch { setMessage('No se pudo copiar automáticamente. Selecciona el texto y cópialo.'); }
  }
  return <section className="admin-card"><h2>Agente para Mercado Libre</h2><p>Prepara un anuncio de servicio para Mercado Libre Perú. Indica solo servicios y condiciones que puedas ofrecer; no incluyas datos sensibles.</p><label htmlFor="ml-details">Datos del servicio</label><textarea id="ml-details" maxLength={2000} value={details} onChange={e => setDetails(e.target.value)} placeholder="Ej. Asesoría para identificar oportunidades de automatización en talleres"/><button type="button" className="primary admin-action" onClick={generate} disabled={busy || !details.trim()}>Preparar anuncio</button>{title && <><label htmlFor="ml-title">Título editable</label><textarea id="ml-title" rows={2} value={title} onChange={e => setTitle(e.target.value)}/><button type="button" className="primary admin-action" onClick={() => copy(title)} disabled={!title.trim()}>Copiar título</button><label htmlFor="ml-description">Descripción editable</label><textarea id="ml-description" rows={8} value={description} onChange={e => setDescription(e.target.value)}/><button type="button" className="primary admin-action" onClick={() => copy(description)} disabled={!description.trim()}>Copiar descripción</button><div className="admin-result"><strong>Antes de publicar</strong><p>{check}</p></div></>}<p>El agente no accede a tu cuenta, no verifica categorías ni costos y no publica. Revisa las políticas y condiciones de Mercado Libre antes de continuar.</p></section>;
}
