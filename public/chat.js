'use strict';
const socket=io();
socket.on('connect',()=>document.querySelector('#connection').textContent='Conectado al servidor');
socket.on('disconnect',()=>document.querySelector('#connection').textContent='Desconectado');
document.querySelector('form').addEventListener('submit',event=>{
 event.preventDefault();
 document.querySelector('#error').textContent='';
 socket.emit('Evento-Mensaje-Server',JSON.stringify({nombre:document.querySelector('#nombre').value,mensaje:document.querySelector('#m').value,color:'#1b4965'}));
 document.querySelector('#m').value='';
});
socket.on('Mensaje-Rechazado',error=>document.querySelector('#error').textContent=error);
socket.on('Evento-Mensaje-Server',raw=>{
 const msg=JSON.parse(raw), li=document.createElement('li'), name=document.createElement('strong');
 name.textContent=msg.nombre+': '; li.append(name);
 if(msg.tipo==='texto') li.append(document.createTextNode(msg.mensaje));
 else {
   // Defensa adicional: validar el protocolo también antes de tocar el DOM.
   const url=new URL(msg.url);
   if(!['http:','https:'].includes(url.protocol)) return;
   let media;
   if(msg.tipo==='imagen'){media=document.createElement('img');media.alt='Imagen compartida';}
   else if(msg.tipo==='video'){media=document.createElement('video');media.controls=true;media.preload='auto';media.setAttribute('aria-label','Video compartido');}
   else if(msg.tipo==='youtube' && url.origin==='https://www.youtube-nocookie.com'){media=document.createElement('iframe');media.title='Video de YouTube';media.width='560';media.height='315';media.allowFullscreen=true;}
   else return;
   media.src=url.href; li.append(media);
 }
 document.querySelector('#messages').append(li);
});
