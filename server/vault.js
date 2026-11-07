'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {Client} = require('pg');
function connectionOptions(env = process.env) {
 if (!env.VAULT_DATABASE_URL) throw new Error('Falta VAULT_DATABASE_URL en .env o en Environment.');
 let url;
 try {url = new URL(env.VAULT_DATABASE_URL);} catch {throw new Error('VAULT_DATABASE_URL no tiene un formato válido.');}
 if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('VAULT_DATABASE_URL debe ser una conexión PostgreSQL.');
 if (url.searchParams.has('sslmode') && url.searchParams.get('sslmode') !== 'verify-full') throw new Error('Conserva sslmode=verify-full en VAULT_DATABASE_URL.');
 const username = decodeURIComponent(url.username);
 if (!/^una_chat_backend(?:\.[a-z0-9]+)?$/.test(username)) throw new Error('La conexión debe usar el rol una_chat_backend, con .PROJECT_REF si usas el pooler.');
 const ssl = {rejectUnauthorized: true, servername: url.hostname};
 if (env.VAULT_CA_CERT_PATH) {
  try {ssl.ca = fs.readFileSync(path.resolve(env.VAULT_CA_CERT_PATH), 'utf8');}
  catch {throw new Error('No se pudo leer el certificado indicado en VAULT_CA_CERT_PATH.');}
 }
 // Se descompone la URI: así sslmode no reemplaza la configuración TLS del cliente.
 return {host: url.hostname, port: Number(url.port || 5432), database: decodeURIComponent(url.pathname.slice(1) || 'postgres'), user: username, password: decodeURIComponent(url.password), ssl, connectionTimeoutMillis: 10000, query_timeout: 10000, application_name: 'una-chat-vault'};
}
async function readVaultSecret(env = process.env, ClientClass = Client) {
 const client = new ClientClass(connectionOptions(env));
 try {
  await client.connect();
  const result = await client.query('select una_chat_private.get_auth0_client_secret() as client_secret');
  const value = result.rows[0]?.client_secret;
  if (typeof value !== 'string' || value.length <= 16) throw new Error('INVALID_VAULT_SECRET');
  return value;
 } catch (error) {
  const messages = {
   '42501': 'Vault rechazó al backend. Revisa el script de permisos.',
   '28P01': 'La contraseña del rol una_chat_backend no fue aceptada.',
   'ENOTFOUND': 'No se encontró el host de Supabase. Copia el host desde Connect.',
   'ENETUNREACH': 'No se pudo alcanzar el host. Prueba el Session pooler IPv4.',
   'ECONNREFUSED': 'Supabase rechazó la conexión. Revisa el host y el puerto.',
   'P0002': 'No existe el secreto una_chat_auth0_client_secret en Vault.',
   'SELF_SIGNED_CERT_IN_CHAIN': 'Falta la CA de Supabase. Configura VAULT_CA_CERT_PATH con el certificado del proyecto.',
   'UNABLE_TO_VERIFY_LEAF_SIGNATURE': 'No se pudo verificar el certificado. Revisa VAULT_CA_CERT_PATH.',
  };
  const safe = new Error(messages[error.code] || 'No se pudo leer el secreto de Vault. Revisa conexión, certificado y nombre del secreto.');
  safe.code = error.code || 'VAULT_READ_FAILED';
  throw safe;
 } finally {await client.end().catch(() => {});}
}
module.exports = {connectionOptions, readVaultSecret};
