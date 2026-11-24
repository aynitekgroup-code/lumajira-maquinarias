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

Esta primera versión es una herramienta local de texto; aún no existe una interfaz dentro del sitio ni inicio de sesión OAuth. No sube imágenes ni programa publicaciones. Para habilitarla en Vercel se requiere autenticación de administradores, protección contra abuso y almacenamiento seguro de tokens antes de exponer cualquier endpoint.

### Prospección asistida

`node server/linkedin-prospect.js` recibe datos que el operador haya verificado sobre una empresa o contacto y usa `DEEPSEEK_API_KEY` para evaluar su posible ajuste y redactar una invitación y un seguimiento. Está orientado a talleres y fábricas medianas en Perú. No busca perfiles automáticamente, no comprueba datos y no envía solicitudes ni mensajes. Revisa el resultado y evita enviar información sensible a un proveedor de IA. La búsqueda y el envío mediante LinkedIn dependen de los permisos oficiales disponibles y requieren una integración futura con aprobación humana.
