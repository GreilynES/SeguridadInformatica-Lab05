# Auth0 React en UNA Chat

Se agregó una interfaz React en `frontend/` usando el SDK oficial `@auth0/auth0-react` 2.x. El servidor Socket.IO, sus validaciones, Sentry y OpenTelemetry mantienen su implementación existente.

## Configurar Auth0

En la aplicación con Client ID `27l2GB81Jajonf7Nhvh9kyY2CoLTRjs4`, configurar:

- Application Type: Single Page Application.
- Token Endpoint Authentication Method: None.
- Allowed Callback URLs: `http://localhost:5173`.
- Allowed Logout URLs: `http://localhost:5173`.
- Allowed Web Origins: `http://localhost:5173`.

Guardar los cambios. Estos tres campos aún estaban pendientes según el prompt proporcionado. Usar `localhost` de forma consistente; `127.0.0.1` es otro origen.

## Ejecutar

```sh
npm install
npm run dev
```

Abrir http://localhost:5173. El comando arranca Express en el puerto 3000 y Vite en el 5173 con `--strictPort`. Si algún puerto está ocupado, cerrar el proceso que lo usa o reutilizarlo ejecutando solo `npm run dev:frontend`. Detener ambos con Ctrl+C.

La configuración pública del prompt está en `frontend/src/auth0-config.js`. Para usar otra aplicación, copiar `frontend/.env.example` a `frontend/.env.local` y ajustar sus valores. Nunca poner un Client Secret en variables VITE, archivos del frontend, logs o capturas.

## Verificar el login

1. Abrir http://localhost:5173 en una ventana privada.
2. Pulsar Iniciar sesión o Crear cuenta y completar el formulario real de Auth0.
3. Al volver, comprobar el nombre de la sesión, Mi perfil y la sala del chat.
4. Enviar texto, una URL multimedia y un intento de script para verificar la validación existente.
5. Pulsar Cerrar sesión y comprobar que vuelve la pantalla de acceso.

El SDK maneja los estados de carga, error, login, registro, perfil y logout. No se implementaron manualmente los flujos OAuth/OIDC. Los datos de sesión quedan en la memoria del SDK; no se configuró almacenamiento persistente de tokens en localStorage.

## Compilar y ejecutar las suites existentes

```sh
npm run build:frontend
npm run test:unit
npm run test:integration
npm run test:e2e
```

Las suites originales siguen verificando el chat de Express en el puerto 3000. No constituyen una prueba de inicio de sesión externo en Auth0. La interfaz React está en el puerto 5173. `npm start` conserva el comando de despliegue del backend; este cambio no publica ni modifica el servicio de Render.

## Alcance

La sesión de Auth0 controla el acceso a la interfaz React. El backend cuenta ahora con una integración independiente de sesión Auth0 y Vault, descrita en VAULT_BACKEND.md. Cuando se inicia con las variables del backend configuradas, el puerto 3000 y Socket.IO requieren esa sesión. La sesión de la SPA no sustituye esa cookie del servidor.

Esta integración es el Quickstart SPA solicitado. No utiliza Client Secret, no consulta Supabase Vault y no completa el flujo de servidor confidencial exigido por la guía del laboratorio 8. La integración del backend se documenta en VAULT_BACKEND.md y usa UNA Chat Backend, una aplicación Auth0 distinta.

Documentación: https://auth0.com/docs/quickstart/spa/react
