const {io:connect}=require('socket.io-client');
const request=require('supertest');
const validation=require('../../libs/unalib');
const {createChatServer}=require('../../server');
let chat,client,peer,spy;
const event='Evento-Mensaje-Server';
const once=(socket,name)=>new Promise(resolve=>socket.once(name,resolve));
beforeAll(async()=>{
 chat=createChatServer();
 await new Promise(resolve=>chat.http.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+chat.http.address().port;
 client=connect(url,{forceNew:true});peer=connect(url,{forceNew:true});
 await Promise.all([once(client,'connect'),once(peer,'connect')]);
 spy=jest.spyOn(validation,'validarMensaje');
});
afterAll(async()=>{spy?.mockRestore();client?.disconnect();peer?.disconnect();if(chat)await new Promise(resolve=>chat.io.close(resolve));});
test('HTTP sirve frontend y política de seguridad',async()=>{
 const res=await request(chat.app).get('/');
 expect(res.status).toBe(200);expect(res.text).toContain('UNA Chat');expect(res.headers['content-security-policy']).toContain("object-src 'none'");
});
test.each([['https://example.com/a.png','imagen'],['https://example.com/a.mp4','video']])('evento acepta y difunde %s',async(mensaje,tipo)=>{
 const raw=JSON.stringify({nombre:'Integración',mensaje});
 const received=once(peer,event);
 const ack=await client.timeout(3000).emitWithAck(event,raw);
 expect(ack).toMatchObject({ok:true,tipo});
 expect(JSON.parse(await received)).toMatchObject({ok:true,tipo,mensaje});
 expect(spy).toHaveBeenCalledWith(raw);
});
test.each(["<script>alert('Inyección de script');</script>",'https://example.com/a.pdf','javascript:alert(1)','not JSON'])('rechaza sin difundir %s',async(value)=>{
 const observer=jest.fn();peer.on(event,observer);
 try {
  const raw=value==='not JSON'?value:JSON.stringify({mensaje:value});
  const error=once(client,'Mensaje-Rechazado');
  const ack=await client.timeout(3000).emitWithAck(event,raw);
  expect(ack.ok).toBe(false);expect(await error).toEqual(ack.error);
  expect(spy).toHaveBeenCalledWith(raw);
  await new Promise(resolve=>setTimeout(resolve,100));expect(observer).not.toHaveBeenCalled();
 }finally{peer.off(event,observer);}
});
