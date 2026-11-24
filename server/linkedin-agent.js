// Local, interactive agent. Credentials and requests remain on the server.
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

async function draftPost(topic) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('Falta DEEPSEEK_API_KEY.');
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'Escribe una publicación para LinkedIn en español para LumaControl, startup peruana de automatización industrial, gestión e inteligencia artificial. Tono profesional y claro. No inventes clientes, cifras, resultados, funcionalidades existentes ni alianzas. No incluyas instrucciones peligrosas. Incluye hasta tres hashtags. Devuelve solo el texto de la publicación; la invitación de contacto se añadirá después.' },
        { role: 'user', content: `Tema de la publicación: ${topic}` },
      ],
      max_tokens: 600,
    }),
  });
  if (!response.ok) throw new Error(`DeepSeek respondió con estado ${response.status}.`);
  const result = await response.json();
  const content = result.choices?.[0]?.message?.content?.trim();
  const text = content && `${content}\n\n¿Te interesa una solución para tu empresa? Escríbenos por WhatsApp para coordinar una llamada: https://wa.me/51920277794`;
  if (!text || text.length > 3000) throw new Error('El borrador está vacío o supera 3000 caracteres.');
  return text;
}

async function publishPost(text) {
  const { LINKEDIN_ACCESS_TOKEN: token, LINKEDIN_ORGANIZATION_ID: organization, LINKEDIN_API_VERSION: version } = process.env;
  if (!token || !/^\d+$/.test(organization || '') || !/^\d{6}$/.test(version || '')) {
    throw new Error('Configura LINKEDIN_ACCESS_TOKEN, LINKEDIN_ORGANIZATION_ID numérico y LINKEDIN_API_VERSION (AAAAMM).');
  }
  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': version,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:organization:${organization}`,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!response.ok) throw new Error(`LinkedIn respondió con estado ${response.status}. Comprueba los permisos de publicación de la organización y la versión de la API.`);
  return response.headers.get('x-restli-id');
}

async function main() {
  const terminal = readline.createInterface({ input: stdin, output: stdout });
  try {
    const topic = (await terminal.question('Tema de la publicación: ')).trim();
    if (!topic || topic.length > 1000) throw new Error('Introduce un tema de entre 1 y 1000 caracteres.');
    const text = await draftPost(topic);
    console.log(`\n--- BORRADOR ---\n${text}\n--- FIN DEL BORRADOR ---\n`);
    const approval = await terminal.question('¿Publicar exactamente este texto en la página de LinkedIn? Escribe PUBLICAR para confirmar: ');
    if (approval !== 'PUBLICAR') return console.log('Cancelado. No se publicó nada.');
    const id = await publishPost(text);
    console.log(id ? `Publicación creada: ${id}` : 'LinkedIn confirmó la publicación.');
  } finally {
    terminal.close();
  }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });

module.exports = { draftPost, publishPost };
