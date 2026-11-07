# Laboratorio 8 Backend con Auth0 y Vault

## Completar en el equipo local

El archivo `.env` contiene el Domain y Client ID de UNA Chat Backend y una clave de sesión aleatoria. Completar únicamente la conexión de Vault. El Client Secret no se escribe en este archivo: se obtiene mediante `una_chat_private.get_auth0_client_secret()` con el rol restringido.

```dotenv
AUTH0_DOMAIN=dev-bz4do4w3vbjlso21.us.auth0.com
AUTH0_CLIENT_ID=pSIgD05jnO1sFQRr2fQuIO1ue1AWXjCb
APP_BASE_URL=http://localhost:3000
VAULT_DATABASE_URL=postgresql://una_chat_backend.PROJECT_REF:PASSWORD@HOST_SESSION_POOLER:5432/postgres?sslmode=verify-full
```

Copiar el host de Session pooler desde Connect en Supabase. El sufijo PROJECT_REF del usuario corresponde al proyecto. PASSWORD es la contraseña del rol una_chat_backend creado en el laboratorio, no la contraseña de postgres. Si tiene caracteres reservados, codificar únicamente la contraseña con encodeURIComponent en un editor local, sin enviarla a páginas externas ni pegarla en un comando que conserve historial.

La conexión directa usa `una_chat_backend` sin sufijo en `db.PROJECT_REF.supabase.co`. La conexión siempre verifica TLS y el nombre del host. Se incluye el certificado público oficial de Supabase en `server/supabase-root-2021-ca.pem`; configurar `VAULT_CA_CERT_PATH=server/supabase-root-2021-ca.pem`. La fuente de descarga es la misma que usa Supabase Studio: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt. No desactivar la verificación para resolver un error de certificado.

## Auth0

Usar UNA Chat Backend, de tipo Regular Web Application y método Client Secret (Post). Su secreto debe estar en Vault con el nombre una_chat_auth0_client_secret. La aplicación React del puerto 5173 usa otro Client ID y mantiene su configuración independiente.

Callbacks permitidos:

```text
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
https://seguridadinformatica-lab05.onrender.com/auth/callback
```

Logout URLs y Web Origins: los tres orígenes anteriores sin /auth/callback.

## Ejecutar y verificar

```sh
npm start
```

Abrir http://localhost:3000, pulsar Iniciar sesión y completar Auth0. Debe volver a /sala. El SDK oficial express-openid-connect maneja el flujo y las cookies de sesión HttpOnly. Al iniciar, el servidor lee Vault, cierra la conexión PostgreSQL y hace una prueba de credencial con un código intencionalmente falso. Se espera invalid_grant; invalid_client detiene el arranque. Solo se registran estado HTTP, error permitido y longitud, nunca el secreto ni la conexión.

Sin cookies: /auth/config devuelve 200 con enabled=true, domain y clientId; /sala y /auth/me devuelven 401; /auth/login redirige a Auth0. Socket.IO también requiere la sesión del backend. El nombre de envío se toma de la sesión.

La sesión de la SPA React no es la sesión del backend. Para las evidencias de Vault usar el puerto 3000 o la URL de Render.

## Render y rotación

Configurar las mismas variables en Render; APP_BASE_URL debe ser https://seguridadinformatica-lab05.onrender.com y SESSION_SECRET debe ser un valor privado aleatorio estable. VAULT_DATABASE_URL es sensible. SESSION_SECRET también debe ocultarse. Si se utiliza una CA, su archivo público debe estar disponible y su ruta configurada. No se ha publicado ni desplegado este cambio automáticamente.

El servidor obtiene el secreto solo desde Vault, aunque todavía exista AUTH0_CLIENT_SECRET en Render. Después del primer login con Vault puede retirarse la variable antigua siguiendo la guía. Al rotar el secreto en Auth0, actualizar el registro de Vault y reiniciar o desplegar de nuevo. Cada arranque vuelve a leer Vault, sin una caché persistente del secreto.

Para registrar la comparación después de la rotación, conserva temporalmente el secreto anterior en un archivo privado fuera del repositorio y ejecuta `node scripts/check-secret-rotation.cjs RUTA_AL_ARCHIVO_PRIVADO`. El script lee el secreto nuevo desde Vault y registra únicamente hora, estado HTTP y el campo error de cada intento. El resultado esperado es invalid_client para el anterior e invalid_grant para el nuevo. No pases el secreto como argumento ni lo incluyas en capturas. Esta comparación no rota ni modifica credenciales por sí sola.

En la comprobación real de este tenant, Auth0 rechazó el secreto anterior con HTTP 401 y `access_denied`, mientras el nuevo devolvió HTTP 403 e `invalid_grant`. El script conserva ese error real y distingue la comprobación funcional de la coincidencia literal con `invalid_client` que pide la guía. No sustituye el código recibido por otro esperado.

## Pruebas

Para repetir la consulta real de permisos y longitud sin mostrar credenciales:

```sh
node scripts/check-vault-access.cjs
```

Las suites históricas sin autenticación siguen ejecutándose con createChatServer() sin configuración. Las pruebas adicionales revisan el modo con Auth0, el bloqueo HTTP y Socket.IO y la conexión de Vault con dependencias simuladas. No acreditan una conexión real a Supabase ni un login real con el nuevo Client ID hasta completar la configuración y probarlos manualmente.

Playwright inicia un servidor de pruebas independiente con NODE_ENV=test y Auth0 vacío, sin cargar el .env privado. El puerto 3000 debe estar libre; no reutiliza el servidor de trabajo. Estas pruebas históricas no comprueban el login con Vault.
