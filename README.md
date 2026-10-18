# UNA Chat Laboratorio 05

Aplicación de chat con Socket.IO, validación de mensajes y visualización segura de imágenes y videos.

## Ejecutar

Se requiere Node.js 22 o posterior y npm.

```sh
npm ci
npx playwright install chromium
npm start
```

Abrir http://127.0.0.1:3000. Frontend y backend comparten servidor.

## Pruebas

```sh
npm run test:unit
npm run test:integration
npm run test:e2e
npm test
npm run report
```

- Unitarias: 37 pruebas, incluidas las 5 originales de `test/test.js`.
- Integración: 7 pruebas con el evento real `Evento-Mensaje-Server`, clientes Socket.IO y Supertest para GET /.
- E2E: 5 pruebas de Playwright en Chromium headed con frontend y backend reales.
- `npm test` ejecuta las 44 pruebas de Jest y excluye `tests/e2e`.
- Las pruebas de integración abren un puerto efímero y cierran clientes y servidor.
- Playwright inicia el servidor si el puerto 3000 está disponible y cierra el servidor que inició. Si ya hay un chat activo, lo reutiliza.

## Ejemplos

```text
Hola, UNA
http://127.0.0.1:3000/media/prueba.png
http://127.0.0.1:3000/media/prueba.webm
https://www.youtube.com/watch?v=qYwlqx-JLok
```

El script `<script>alert('Inyección de script');</script>` debe ser rechazado con `Contenido no permitido`.

## Diseño

`libs/unalib.js` expone `validarMensaje` y el adaptador compatible `validateMessage`. Los mensajes aceptados son objetos estructurados con `ok`, `nombre`, `mensaje`, `color` y `tipo`, más `url` para medios. Los mensajes rechazados reciben `ok: false` en el acuse Socket.IO y el evento `Mensaje-Rechazado`; no se difunden.

El frontend usa nodos de texto y elementos DOM. No convierte cadenas de mensajes a HTML. La política CSP restringe scripts al propio servidor y los iframes al dominio de inserción de YouTube.

Se comprueban HTTP/HTTPS, extensiones de imágenes PNG/JPG/JPEG/GIF/BMP/WebP, videos MP4/WebM/OGG e IDs válidos de YouTube. La validación de URL es estructural: no certifica el MIME ni disponibilidad de un recurso externo. El navegador verifica la carga real de medios locales en E2E. Los PNG/WebM de `public/media` son recursos de prueba generados localmente, sin dependencia de sitios externos.

Los límites y validaciones cubren el alcance del laboratorio. Un despliegue público requeriría controles adicionales de autenticación, moderación y límites de frecuencia.

## Dependencias

Se conserva `package-lock.json` para instalaciones reproducibles. La consulta `npm audit --omit=dev` no reportó vulnerabilidades de producción durante la ejecución del laboratorio. El análisis completo reportó 19 avisos moderados en dependencias transitivas de desarrollo de Jest. Mocha se retiró al migrar la ejecución a Jest; se conservaron las pruebas originales.

## Evidencias

Las capturas JPG y registros de ejecución están en la carpeta hermana `evidencias`. La evidencia 1 muestra el registro real del evento `dialog` detectado por Playwright en el código original; no es una captura del diálogo nativo. Las evidencias 2 y 3 son capturas de un visor que presenta íntegramente la salida real guardada de las pruebas. La evidencia 4 incluye el reporte HTML original de Playwright y la salida de consola.

Para la entrega, publicar este código en el repositorio del estudiante y escribir su URL real en `repositorio.txt`. Las instrucciones finales de la guía solicitan JPG y el enlace al código; el Word reúne las evidencias para revisión.

## Referencias

- https://socket.io/docs/v4/testing/
- https://playwright.dev/docs/test-assertions
- https://jestjs.io/docs/configuration
# SeguridadInformatica-Lab05
