const request=require('supertest');
const {io:connect}=require('socket.io-client');
const {createChatServer}=require('../../server');
const settings={domain:'dev-bz4do4w3vbjlso21.us.auth0.com',clientId:'public-test-client',clientSecret:'fake-test-client-secret-value',sessionSecret:'x'.repeat(64),baseURL:'http://localhost:3000'};
let chat;
beforeAll(async()=>{chat=createChatServer({authSettings:settings});await new Promise(resolve=>chat.http.listen(0,'127.0.0.1',resolve));});
afterAll(async()=>{if(chat)await new Promise(resolve=>chat.io.close(resolve));});
test('configuración pública activa no muestra secretos',async()=>{
 const res=await request(chat.app).get('/auth/config');
 expect(res.status).toBe(200);expect(res.body).toEqual({enabled:true,domain:settings.domain,clientId:settings.clientId});
 expect(res.text).not.toContain(settings.clientSecret);expect(res.text).not.toContain(settings.sessionSecret);
});
test('inicio anónimo presenta enlace de login y no el formulario del chat',async()=>{
 const res=await request(chat.app).get('/');
 expect(res.status).toBe(200);expect(res.text).toContain('/auth/login');expect(res.text).not.toContain('id="messages"');
});
test.each(['/sala','/auth/me'])('sin cookie bloquea %s con 401',async path=>{
 const res=await request(chat.app).get(path);expect(res.status).toBe(401);expect(res.body.error).toContain('Inicia sesión');
});
test('Socket.IO rechaza handshake sin cookie de sesión',async()=>{
 const client=connect('http://127.0.0.1:'+chat.http.address().port,{forceNew:true,reconnection:false,timeout:3000});
 try {
  const result=await new Promise(resolve=>{client.once('connect',()=>resolve('connected'));client.once('connect_error',()=>resolve('rejected'));});
  expect(result).toBe('rejected');
 }finally{client.disconnect();}
});
