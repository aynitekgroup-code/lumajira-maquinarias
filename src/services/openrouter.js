let lastRequestTime = 0;
const RATE_LIMIT_MS = 30000;

export async function getAIRecommendation(alertData) {
  const now = Date.now();
  if (now - lastRequestTime < RATE_LIMIT_MS) {
    return {
      explanation: 'Espera 30 segundos antes de pedir otra recomendacion.',
      fix: '',
    };
  }

  lastRequestTime = now;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'LumaControl',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en mantenimiento industrial. Responde en español de forma breve y practica.',
          },
          {
            role: 'user',
            content: `Analiza esta alerta de una maquina de inyeccion plastica y da recomendacion de mantenimiento: ${JSON.stringify(alertData)}`,
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter error:', errText);
      return {
        explanation: 'Error al obtener recomendacion de IA. Intenta de nuevo.',
        fix: '',
      };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'Sin respuesta de la IA.';
    return {
      explanation: text,
      fix: '',
    };
  } catch (error) {
    console.error('OpenRouter fetch error:', error);
    return {
      explanation: 'Error al obtener recomendacion de IA. Verifica tu conexion.',
      fix: '',
    };
  }
}
