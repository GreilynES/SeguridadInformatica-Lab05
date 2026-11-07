'use strict';
fetch('/auth/me').then(response => response.ok ? response.json() : Promise.reject()).then(user => {
 const label=document.querySelector('#session-name');
 if(label) label.textContent=user.name;
 const input=document.querySelector('#nombre');
 if(input) {input.value=user.name.slice(0,80);input.readOnly=true;}
}).catch(() => window.location.replace('/'));
