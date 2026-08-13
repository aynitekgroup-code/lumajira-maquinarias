import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase/config';

const functions = getFunctions(app, 'us-central1');

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
    const callable = httpsCallable(functions, 'getAIRecommendation');
    const result = await callable(alertData);
    return result.data;
  } catch (error) {
    console.error('Cloud Function error:', error);
    const code = error.code || '';
    if (code.includes('unauthenticated')) {
      return { explanation: 'Inicia sesion para usar la IA.', fix: '' };
    }
    if (code.includes('failed-precondition')) {
      return { explanation: 'IA no configurada en el servidor. Contacta al administrador.', fix: '' };
    }
    if (code.includes('resource-exhausted')) {
      return { explanation: 'Espera 30 segundos antes de pedir otra recomendacion.', fix: '' };
    }
    return {
      explanation: 'Error al obtener recomendacion de IA. Intenta de nuevo.',
      fix: '',
    };
  }
}
