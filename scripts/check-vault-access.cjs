'use strict';
require('dotenv').config({path:require('path').join(__dirname,'../.env'),quiet:true});
const {Client}=require('pg');
const {connectionOptions}=require('../server/vault');
(async()=>{
 const client=new Client(connectionOptions());
 try {
  await client.connect();
  const r=await client.query(`select
   current_user as connected_role,
   length(una_chat_private.get_auth0_client_secret()) as secret_length,
   has_function_privilege('anon','una_chat_private.get_auth0_client_secret()','execute') as anon_execute,
   has_function_privilege('authenticated','una_chat_private.get_auth0_client_secret()','execute') as authenticated_execute,
   has_function_privilege('public','una_chat_private.get_auth0_client_secret()','execute') as public_execute,
   has_function_privilege('una_chat_backend','una_chat_private.get_auth0_client_secret()','execute') as backend_execute,
   has_table_privilege('anon',(select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='vault' and c.relname='decrypted_secrets'),'select') as anon_reads_vault,
   has_table_privilege('authenticated',(select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='vault' and c.relname='decrypted_secrets'),'select') as authenticated_reads_vault,
   pg_has_role('postgres','una_chat_backend','SET') as dashboard_can_set_role,
   pg_has_role('postgres','una_chat_backend','USAGE') as dashboard_inherits_privileges`);
  console.log(JSON.stringify({time:new Date().toISOString(),source:'Consulta real con el rol restringido; sin mostrar el secreto',tls_verified:client.connection.stream.authorized===true,...r.rows[0]},null,2));
 }catch(e){console.error('Comprobación de permisos no completada; código '+(e.code||'UNKNOWN'));process.exitCode=1;}
 finally{await client.end().catch(()=>{});}
})().catch(()=>{console.error('No se pudo preparar la conexión privada.');process.exitCode=1;});
