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
