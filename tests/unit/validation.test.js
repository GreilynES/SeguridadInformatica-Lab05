const v=require('../../libs/unalib');
const send=mensaje=>v.validarMensaje(JSON.stringify({nombre:'Estudiante',mensaje}));
describe('Validación segura de mensajes',()=>{
 test.each(['https://example.com/photo.PNG','http://example.com/a.jpg?x=1','https://example.com/a.webp'])('acepta imagen %s',url=>{expect(send(url)).toMatchObject({ok:true,tipo:'imagen'});});
 test.each(['https://example.com/a.mp4','https://example.com/a.webm','http://example.com/a.ogg'])('acepta video %s',url=>{expect(send(url)).toMatchObject({ok:true,tipo:'video'});});
 test('acepta YouTube con ID completo',()=>expect(send('https://youtu.be/qYwlqx-JLok')).toMatchObject({ok:true,tipo:'youtube',url:'https://www.youtube-nocookie.com/embed/qYwlqx-JLok'}));
 test.each(["<script>alert('Inyección de script');</script>",'<img src=x onerror=alert(1)>','javascript:alert(1)','data:text/html,hi','https://example.com/file.pdf','https://example.com/a.jpg.exe','https://example.com/a.svg','ftp://example.com/a.png','https://user:pass@example.com/a.png','https://example.com/a.png%22','https://youtube.com.evil.test/watch?v=qYwlqx-JLok','https://youtu.be/short'])('rechaza %s',s=>expect(send(s).ok).toBe(false));
 test.each([null,123,'bad json','{}','[]','null',JSON.stringify({mensaje:''}),JSON.stringify({mensaje:123})])('rechaza estructura inválida %p',raw=>expect(v.validarMensaje(raw).ok).toBe(false));
 test('acepta texto normal',()=>expect(send('Hola, UNA')).toMatchObject({ok:true,tipo:'texto',mensaje:'Hola, UNA'}));
 test('rechaza inyección en nombre',()=>expect(v.validarMensaje(JSON.stringify({nombre:'<img src=x onerror=alert(1)>',mensaje:'Hola'})).ok).toBe(false));
 test('normaliza color no confiable',()=>expect(v.validarMensaje(JSON.stringify({mensaje:'Hola',color:'red;bad'})).color).toBe('#1b4965'));
 test('limita longitud',()=>expect(send('a'.repeat(2001)).ok).toBe(false));
 test('compatibilidad con validateMessage',()=>expect(JSON.parse(v.validateMessage(JSON.stringify({mensaje:'Hola'}))).ok).toBe(true));
 test('fallo intencional para comprobar el bloqueo', () => {
  expect(1 + 1).toBe(3);
});
