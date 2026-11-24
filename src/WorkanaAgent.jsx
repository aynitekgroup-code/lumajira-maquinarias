import React, { useState } from 'react';

export default function WorkanaAgent({ request, busy, setMessage }) {
  const [project, setProject] = useState('');
  const [evaluation, setEvaluation] = useState('');
  const [proposal, setProposal] = useState('');

  async function analyze() {
    setEvaluation(''); setProposal('');
    const result = await request('workana', project);
    if (result) { setEvaluation(result.text.evaluacion); setProposal(result.text.propuesta); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(proposal); setMessage('Propuesta copiada. Revísala antes de enviarla en Workana.'); }
    catch { setMessage('No se pudo copiar automáticamente. Selecciona el texto y cópialo.'); }
  }
  return <section className="admin-card"><h2>Agente para Workana</h2><p>Pega la descripción de una oportunidad para evaluar su ajuste y preparar una propuesta. No incluyas datos sensibles.</p><label htmlFor="workana-project">Descripción del proyecto</label><textarea id="workana-project" maxLength={2000} value={project} onChange={e => setProject(e.target.value)} placeholder="Pega aquí la descripción del proyecto de Workana"/><button type="button" className="primary admin-action" disabled={busy || !project.trim()} onClick={analyze}>Analizar proyecto</button>{evaluation && <><div className="admin-result"><strong>Evaluación y preguntas</strong><p>{evaluation}</p></div><label htmlFor="workana-proposal">Propuesta para revisar y editar</label><textarea id="workana-proposal" rows={8} value={proposal} onChange={e => setProposal(e.target.value)}/><button type="button" className="primary admin-action" onClick={copy} disabled={!proposal.trim()}>Copiar propuesta</button></>}<p>La propuesta no se guarda ni se envía automáticamente. Revisa los términos de Workana antes de enviarla.</p></section>;
}
