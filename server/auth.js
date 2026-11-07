'use strict';
const {auth} = require('express-openid-connect');
const {readVaultSecret} = require('./vault');
function publicConfig(settings) {
 return settings ? {enabled: true, domain: settings.domain, clientId: settings.clientId} : {enabled: false};
}
function validatedEnvironment(env) {
 const domain = env.AUTH0_DOMAIN;
 if (!domain && !env.AUTH0_CLIENT_ID) {
  if (env.NODE_ENV === 'production') throw new Error('Faltan AUTH0_DOMAIN y AUTH0_CLIENT_ID. No se permite iniciar producción sin autenticación.');
  return null;
 }
 if (!domain || !/^[a-zA-Z0-9.-]+$/.test(domain) || !domain.includes('.')) throw new Error('AUTH0_DOMAIN debe ser el dominio sin https:// ni rutas.');
 if (!env.AUTH0_CLIENT_ID) throw new Error('Falta AUTH0_CLIENT_ID.');
 if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error('Falta SESSION_SECRET de al menos 32 caracteres.');
 let url;
 try {url = new URL(env.APP_BASE_URL);} catch {throw new Error('Falta APP_BASE_URL con la URL local o pública del servidor.');}
 if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('APP_BASE_URL debe contener solo el origen, sin rutas.');
 if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) throw new Error('Usa HTTPS para APP_BASE_URL, salvo en localhost o 127.0.0.1.');
 return {domain, clientId: env.AUTH0_CLIENT_ID, baseURL: url.origin, sessionSecret: env.SESSION_SECRET};
}
async function requestCredentialProbe(settings, fetcher = fetch) {
 const response = await fetcher(`https://${settings.domain}/oauth/token`, {
  method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, signal: AbortSignal.timeout(15000),
  body: new URLSearchParams({grant_type: 'authorization_code', client_id: settings.clientId, client_secret: settings.clientSecret, code: 'vault-startup-probe', redirect_uri: settings.baseURL + '/auth/callback', code_verifier: 'vault-lab-startup-verifier-0123456789012345678901234567890123456789'}),
 });
 let result;
 try {result = await response.json();} catch {throw new Error('Auth0 no devolvió una respuesta JSON a la prueba de arranque.');}
 // Solo se conserva el estado y el código permitido. Nunca el cuerpo ni las credenciales.
 const error = ['invalid_client','invalid_grant'].includes(result.error) ? result.error : 'unexpected_response';
 return {httpStatus: response.status, error};
}
async function probeClientSecret(settings, fetcher = fetch) {
 const result = await requestCredentialProbe(settings, fetcher);
 const {error} = result;
 if (error !== 'invalid_grant') throw new Error(error === 'invalid_client' ? 'Auth0 devolvió invalid_client. Revisa el secreto y el método Client Secret (Post) de UNA Chat Backend.' : 'Auth0 no confirmó la prueba de credencial. Revisa aplicación, callback y conectividad.');
 return result;
}
async function loadAuthSettings(env = process.env) {
 const settings = validatedEnvironment(env);
 if (!settings) return null;
 const clientSecret = await readVaultSecret(env);
 const complete = {...settings, clientSecret};
 let probe;
 try {probe = await probeClientSecret(complete);} catch(error) {
  if (error.name === 'TimeoutError' || error.name === 'TypeError') throw new Error('No se pudo conectar con Auth0 para verificar la credencial.');
  throw error;
 }
 console.log(`Auth0: prueba de arranque HTTP ${probe.httpStatus}, ${probe.error} (código de prueba falso).`);
 console.log(`Vault: lectura correcta; longitud del secreto ${clientSecret.length}.`);
 return complete;
}
function sessionMiddleware(settings) {
 return auth({
  authRequired: false, auth0Logout: true,
  issuerBaseURL: `https://${settings.domain}`, baseURL: settings.baseURL,
  clientID: settings.clientId, clientSecret: settings.clientSecret, secret: settings.sessionSecret,
  clientAuthMethod: 'client_secret_post',
  authorizationParams: {response_type: 'code', response_mode: 'query', scope: 'openid profile email'},
  routes: {login: '/auth/login', logout: '/auth/logout', callback: '/auth/callback', postLogoutRedirect: '/'},
  getLoginState: () => ({returnTo: '/sala'}),
  session: {name: 'unaChatSession', rolling: true, rollingDuration: 3600, absoluteDuration: 28800, cookie: {httpOnly: true, secure: settings.baseURL.startsWith('https:'), sameSite: 'Lax'}},
 });
}
function signedIn(req) {return Boolean(req.oidc?.isAuthenticated());}
function requireSession(req,res,next) {
 if (signedIn(req)) return next();
 return res.status(401).json({error: 'Inicia sesión para entrar a la sala.', login: '/auth/login'});
}
function userProfile(req) {
 const user=req.oidc.user;
 return {name: user.name || user.nickname || 'Usuario', ...(user.email ? {email: user.email} : {})};
}
module.exports = {publicConfig, validatedEnvironment, requestCredentialProbe, probeClientSecret, loadAuthSettings, sessionMiddleware, signedIn, requireSession, userProfile};
