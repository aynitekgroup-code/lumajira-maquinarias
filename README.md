# LumaControl

LumaControl es una startup industrial con la visión de transformar talleres y fábricas tradicionales en operaciones inteligentes, conectando procesos industriales y de gestión con automatización y agentes de inteligencia artificial.

## Sitio web

La aplicación React presenta la nueva visión de LumaControl. Es una base informativa: las integraciones industriales y los agentes de IA aún no están implementados en esta nueva versión.

```bash
npm install
npm start
npm run build
```

La configuración de despliegue existente en `vercel.json` se conserva. Los cambios locales no se publican hasta enviarlos al repositorio y desplegarlos. Los archivos de integraciones anteriores y los que contienen cambios locales se conservan para revisión; no están conectados al nuevo sitio.

## DeepSeek

`server/deepseek.js` contiene un cliente para futuras funciones de servidor. Configura `DEEPSEEK_API_KEY` como variable de entorno secreta en Vercel (Project Settings → Environment Variables); no uses el prefijo `REACT_APP_`, que expondría la clave en el navegador. No subas la clave a GitHub ni la compartas en el chat.

El sitio actual no tiene un agente ni un endpoint conectados a este cliente. Antes de habilitarlo hay que crear una función de servidor con autenticación, límites de uso y validación; `npm start` solo ejecuta la aplicación React. El archivo antiguo `src/services/openrouter.js` está sin conectar y no debe utilizarse: realiza llamadas desde el navegador y expone la clave.

## Agente de LinkedIn (local)

`node server/linkedin-agent.js` pide un tema, genera un borrador con DeepSeek y muestra el texto completo. Solo publica si se escribe `PUBLICAR` expresamente. Ejecuta el comando en un entorno privado, no en el navegador ni desde una función pública sin autenticación.

Variables de entorno del proceso: `DEEPSEEK_API_KEY`, `LINKEDIN_ACCESS_TOKEN` (token de un administrador de la página con permisos de publicación de organización), `LINKEDIN_ORGANIZATION_ID` (ID numérico de la página) y `LINKEDIN_API_VERSION` (versión vigente de LinkedIn en formato `AAAAMM`). LinkedIn debe conceder a la aplicación los productos y permisos necesarios; crear la página no concede acceso automáticamente. El token puede caducar y debe mantenerse secreto. Consulta la documentación oficial de LinkedIn para configurar la aplicación, autorización OAuth y versión vigente. No guardes credenciales en Git ni uses variables `REACT_APP_`.

La herramienta local no sube imágenes ni programa publicaciones. El panel web descrito abajo usa el mismo cliente de servidor y requiere configuración independiente.

### Prospección asistida

`node server/linkedin-prospect.js` recibe datos que el operador haya verificado sobre una empresa o contacto y usa `DEEPSEEK_API_KEY` para evaluar su posible ajuste y redactar una invitación y un seguimiento. Está orientado a talleres y fábricas medianas en Perú. No busca perfiles automáticamente, no comprueba datos y no envía solicitudes ni mensajes. Revisa el resultado y evita enviar información sensible a un proveedor de IA. La búsqueda y el envío mediante LinkedIn dependen de los permisos oficiales disponibles y requieren una integración futura con aprobación humana.

### Panel web privado

El panel está en `https://www.lumajirahub.com/admin` y solo autoriza el correo verificado `aynitek.group@gmail.com`. Para activarlo en Vercel configura las variables secretas `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` (cadena aleatoria de al menos 32 caracteres), `DEEPSEEK_API_KEY`, `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_ORGANIZATION_ID` y `LINKEDIN_API_VERSION`. En Google Cloud habilita el inicio de sesión OAuth, configura la pantalla de consentimiento y registra como URI de redirección exactamente `https://www.lumajirahub.com/api/admin?action=callback`. Si la aplicación de Google está en modo prueba, añade el correo administrador como usuario de prueba. No compartas ni subas estos secretos al repositorio. Tras agregar las variables, vuelve a desplegar en Vercel.

El panel llama a `api/admin.js`, una función de Vercel; `npm start` no ejecuta la función. La sesión dura ocho horas. Los borradores y análisis no se guardan. El botón de publicación solicita confirmación explícita y solo funcionará con un token de administrador y los permisos oficiales de LinkedIn para la organización. La prospección sigue siendo asistida: no busca contactos ni envía solicitudes. No se incluye un mecanismo de límites de uso persistente; antes de ampliar el acceso debe añadirse uno.
