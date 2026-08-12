const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.REACT_APP_OPENROUTER_API_KEY;
const MODEL = 'openai/gpt-4o-mini';

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

  if (!API_KEY || API_KEY === 'sk-or-your-key-here') {
    return {
      explanation: 'API key de OpenRouter no configurada. Agrega REACT_APP_OPENROUTER_API_KEY en tu .env',
      fix: '',
    };
  }

  lastRequestTime = now;

  const prompt = buildPrompt(alertData);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lumacontrol.vercel.app',
        'X-Title': 'LumaControl',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en maquinas de inyeccion de plastico y mantenimiento industrial. Responde siempre en espanol. Sé conciso: maximo 3 oraciones para la explicacion y 3 oraciones para la solucion.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter error:', response.status, errorData);
      return {
        explanation: `Error de la API: ${response.status}. Verifica tu API key.`,
        fix: '',
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const parts = content.split('\n').filter((line) => line.trim());
    const explanation = parts.slice(0, Math.ceil(parts.length / 2)).join(' ');
    const fix = parts.slice(Math.ceil(parts.length / 2)).join(' ');

    return {
      explanation: explanation || 'No se pudo generar explicacion.',
      fix: fix || '',
    };
  } catch (error) {
    console.error('OpenRouter fetch error:', error);
    return {
      explanation: 'Error de conexion con OpenRouter. Verifica tu internet.',
      fix: '',
    };
  }
}

function buildPrompt(alertData) {
  const { level, message, currentA, tempC, machineState, trend, variance } = alertData;

  let prompt = `Lecturas actuales de la maquina de inyeccion:\n`;
  prompt += `- Corriente: ${currentA !== undefined ? currentA.toFixed(2) + 'A' : 'N/A'}\n`;
  prompt += `- Temperatura: ${tempC !== undefined ? tempC.toFixed(1) + '°C' : 'N/A'}\n`;
  prompt += `- Estado: ${machineState || 'desconocido'}\n`;

  if (trend !== undefined) {
    prompt += `- Tendencia de corriente: ${trend > 0 ? 'creciente' : trend < 0 ? 'decreciente' : 'estable'}\n`;
  }
  if (variance !== undefined) {
    prompt += `- Estabilidad: ${variance > 1.5 ? 'inestable' : 'estable'}\n`;
  }

  prompt += `- Nivel de alerta: ${level === 'critical' ? 'critico' : 'advertencia'}\n`;
  prompt += `- Mensaje: ${message}\n\n`;

  prompt += `Explica que esta causando esta alerta (maximo 3 oraciones) y luego dame una solucion especifica paso a paso (maximo 3 oraciones). Responde en espanol.`;

  return prompt;
}
