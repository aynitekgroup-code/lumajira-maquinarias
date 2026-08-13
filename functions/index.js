const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();

const openRouterKey = defineSecret('OPENROUTER_API_KEY');
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';
const MAX_OUTPUT_TOKENS = 120;
const RATE_LIMIT_MS = 30000;

function buildPrompt(alertData) {
  const { level, message, currentA, tempC } = alertData;
  const parts = [
    `Alerta: ${message}`,
    `Nivel: ${level === 'critical' ? 'critico' : 'advertencia'}`,
    currentA !== undefined ? `Corriente: ${Number(currentA).toFixed(2)}A` : null,
    tempC !== undefined ? `Temp: ${Number(tempC).toFixed(1)}C` : null,
  ].filter(Boolean);
  return `${parts.join('. ')}. Explica causa (2 oraciones) y solucion (2 oraciones). Espanol.`;
}

async function checkRateLimit(uid) {
  const ref = admin.firestore().collection('aiUsage').doc(uid);
  const snap = await ref.get();
  const lastCall = snap.exists ? snap.data().lastCall : 0;
  const now = Date.now();
  if (now - lastCall < RATE_LIMIT_MS) {
    throw new HttpsError(
      'resource-exhausted',
      'Espera 30 segundos antes de pedir otra recomendacion.'
    );
  }
  await ref.set({ lastCall: now }, { merge: true });
}

async function callOpenRouter(apiKey, alertData) {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://www.lumajirahub.com',
      'X-Title': 'LumaControl',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'Experto en inyeccion de plastico. Respuestas breves en espanol.',
        },
        {
          role: 'user',
          content: buildPrompt(alertData),
        },
      ],
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('OpenRouter error:', response.status, errorData);
    throw new HttpsError('internal', `OpenRouter error: ${response.status}`);
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
}

exports.getAIRecommendation = onCall(
  { secrets: [openRouterKey], region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesion para usar la IA.');
    }

    const alertData = request.data;
    if (!alertData?.message) {
      throw new HttpsError('invalid-argument', 'Datos de alerta invalidos.');
    }

    const apiKey = openRouterKey.value();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'OpenRouter no configurado en el servidor.');
    }

    await checkRateLimit(request.auth.uid);
    return callOpenRouter(apiKey, alertData);
  }
);

exports.sendCriticalAlert = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'No autenticado.');
    }

    const { title, body } = request.data || {};
    if (!title || !body) {
      throw new HttpsError('invalid-argument', 'Titulo y cuerpo requeridos.');
    }

    const userDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      return { sent: false, reason: 'no_token' };
    }

    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      android: { priority: 'high' },
    });

    return { sent: true };
  }
);
