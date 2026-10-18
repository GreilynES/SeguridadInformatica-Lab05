'use strict';
const express=require('express');
const {createServer}=require('http');
const {Server}=require('socket.io');
const validation=require('./libs/unalib');
function createChatServer() {
 const app=express();
 const http=createServer(app);
 const io=new Server(http,{maxHttpBufferSize:16000});
 app.use((_req,res,next)=>{
   res.set('X-Content-Type-Options','nosniff');
   res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' http: https:; media-src 'self' http: https:; frame-src https://www.youtube-nocookie.com; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'");
   next();
 });
 app.get('/',(_req,res)=>res.sendFile(__dirname+'/index.html'));
 app.use(express.static(__dirname+'/public'));
 io.on('connection',socket=>socket.on('Evento-Mensaje-Server',(raw,ack)=>{
   const result=validation.validarMensaje(raw);
   if(result.ok) io.emit('Evento-Mensaje-Server',JSON.stringify(result));
   else socket.emit('Mensaje-Rechazado',result.error);
   if(typeof ack === 'function') ack(result);
 }));
 return {app,http,io};
}
if(require.main===module){
 const {http}=createChatServer();
 const port=process.env.PORT || 3000;
 http.listen(port,'127.0.0.1',()=>console.log('UNA Chat http://127.0.0.1:'+port));
}
module.exports={createChatServer};
