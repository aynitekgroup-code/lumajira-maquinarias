// Server-side only: never import this module into the React application.
async function getDeepSeekRecommendation(alertData) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY no está configurada.');

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente de mantenimiento industrial. Responde en español de forma breve y práctica. No indiques que se omitan procedimientos de seguridad; recomienda la revisión por personal cualificado.',
        },
        {
          role: 'user',
          content: `Analiza esta alerta industrial y ofrece recomendaciones: ${JSON.stringify(alertData)}`,
        },
      ],
      max_tokens: 500,
    }),
  });

  if (!response.ok) throw new Error(`DeepSeek respondió con estado ${response.status}.`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('DeepSeek no devolvió una respuesta válida.');
  }
  return content;
}

module.exports = { getDeepSeekRecommendation };
