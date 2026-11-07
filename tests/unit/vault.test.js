const {connectionOptions,readVaultSecret}=require('../../server/vault');
const {publicConfig,validatedEnvironment,probeClientSecret,requestCredentialProbe}=require('../../server/auth');
const env={VAULT_DATABASE_URL:'postgresql://una_chat_backend.project:fake%40password@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=verify-full'};
test('conexión conserva TLS y decodifica solo campos de la URI',()=>{
 const config=connectionOptions(env);
 expect(config).toMatchObject({user:'una_chat_backend.project',password:'fake@password',host:'aws-0-us-east-1.pooler.supabase.com',ssl:{rejectUnauthorized:true,servername:'aws-0-us-east-1.pooler.supabase.com'}});
 expect(config.connectionString).toBeUndefined();
});
test.each([{}, {VAULT_DATABASE_URL:'bad'}, {VAULT_DATABASE_URL:env.VAULT_DATABASE_URL.replace('postgresql:', 'http:')}, {VAULT_DATABASE_URL:env.VAULT_DATABASE_URL.replace('verify-full','disable')}, {VAULT_DATABASE_URL:env.VAULT_DATABASE_URL.replace('una_chat_backend.project','postgres')}])('rechaza conexión insegura o no configurada %p',value=>expect(()=>connectionOptions(value)).toThrow());
test('lee únicamente la función restringida y cierra el cliente',async()=>{
 const query=jest.fn().mockResolvedValue({rows:[{client_secret:'fake-long-test-secret-value'}]});
 const end=jest.fn().mockResolvedValue();
 class FakeClient {connect=jest.fn().mockResolvedValue();query=query;end=end;}
 await expect(readVaultSecret(env,FakeClient)).resolves.toBe('fake-long-test-secret-value');
 expect(query).toHaveBeenCalledWith('select una_chat_private.get_auth0_client_secret() as client_secret');
 expect(end).toHaveBeenCalledTimes(1);
});
test('cierra conexión y oculta la URI y el secreto en errores',async()=>{
 const end=jest.fn().mockResolvedValue();
 class FakeClient {connect=jest.fn().mockResolvedValue();query=jest.fn().mockRejectedValue(new Error('secret-leaked postgresql://private'));end=end;}
 let error;try{await readVaultSecret(env,FakeClient);}catch(e){error=e;}
 expect(error.message).not.toContain('secret-leaked');expect(error.message).not.toContain('postgresql://');expect(end).toHaveBeenCalled();
});
test('configuración pública excluye credenciales',()=>{
 const result=publicConfig({domain:'tenant.auth0.com',clientId:'public-id',clientSecret:'private',sessionSecret:'private-cookie'});
 expect(result).toEqual({enabled:true,domain:'tenant.auth0.com',clientId:'public-id'});
 expect(publicConfig(null)).toEqual({enabled:false});
});
test('ausencia de Auth0 permite modo histórico',()=>expect(validatedEnvironment({})).toBeNull());
test('producción no inicia sin Auth0',()=>expect(()=>validatedEnvironment({NODE_ENV:'production'})).toThrow('No se permite iniciar producción sin autenticación'));
test.each(['http://example.com','https://example.com/not-origin','https://example.com/?x=1'])('rechaza base URL insegura o con ruta %s',base=>expect(()=>validatedEnvironment({AUTH0_DOMAIN:'tenant.auth0.com',AUTH0_CLIENT_ID:'public',SESSION_SECRET:'x'.repeat(64),APP_BASE_URL:base})).toThrow());
test('prueba de credencial acepta únicamente invalid_grant y oculta el resto del cuerpo',async()=>{
 const fake=jest.fn().mockResolvedValue({status:403,json:async()=>({error:'invalid_grant',private:'never return'})});
 const settings={domain:'tenant.auth0.com',clientId:'public',clientSecret:'test-private',baseURL:'http://localhost:3000'};
 await expect(probeClientSecret(settings,fake)).resolves.toEqual({httpStatus:403,error:'invalid_grant'});
 const [url,options]=fake.mock.calls[0];expect(url).toBe('https://tenant.auth0.com/oauth/token');
 expect(options.body.get('redirect_uri')).toBe('http://localhost:3000/auth/callback');
 expect(options.body.get('code')).toBe('vault-startup-probe');
});
test('invalid_client impide continuar',async()=>{
 const fake=async()=>({status:401,json:async()=>({error:'invalid_client'})});
 await expect(probeClientSecret({domain:'tenant.auth0.com',clientId:'public',clientSecret:'private',baseURL:'http://localhost:3000'},fake)).rejects.toThrow('invalid_client');
});
test('conserva access_denied real de Auth0 sin devolver campos privados',async()=>{
 const fake=async()=>({status:401,json:async()=>({error:'access_denied',error_description:'private diagnostic'})});
 const settings={domain:'tenant.auth0.com',clientId:'public',clientSecret:'private',baseURL:'http://localhost:3000'};
 await expect(requestCredentialProbe(settings,fake)).resolves.toEqual({httpStatus:401,error:'access_denied'});
 await expect(probeClientSecret(settings,fake)).rejects.toThrow('access_denied');
});
