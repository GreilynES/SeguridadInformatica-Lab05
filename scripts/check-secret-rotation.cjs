'use strict';
require('dotenv').config({path:require('path').join(__dirname,'../.env'),quiet:true});
const fs=require('fs');
const {readVaultSecret}=require('../server/vault');
const {validatedEnvironment,requestCredentialProbe}=require('../server/auth');
(async()=>{
 const settings=validatedEnvironment(process.env);
 if(!settings)throw new Error('Configura Auth0 antes de la comparación.');
 if(!process.argv[2])throw new Error('Indica la ruta de un archivo privado con el secreto anterior. No pases el secreto en la línea de comandos.');
 let previous;
 try{previous=fs.readFileSync(process.argv[2],'utf8').trim();}catch{throw new Error('No se pudo leer el archivo privado del secreto anterior.');}
 if(previous.length<=16)throw new Error('El archivo privado no contiene un secreto válido.');
 const current=await readVaultSecret();
 if(previous===current)throw new Error('Los dos valores son iguales. Actualiza Vault después de rotar Auth0 antes de comparar.');
 const results=[];
 for(const [label,value] of [['anterior',previous],['nuevo_desde_vault',current]]){
  const result=await requestCredentialProbe({...settings,clientSecret:value});
  results.push({time:new Date().toISOString(),credential:label,...result});
 }
 console.log(JSON.stringify({results,passed:results[0].error==='invalid_client'&&results[1].error==='invalid_grant'},null,2));
 if(!(results[0].error==='invalid_client'&&results[1].error==='invalid_grant'))process.exitCode=1;
})().catch(e=>{const allowed=/^(Configura Auth0|Indica la ruta|No se pudo leer el archivo privado|El archivo privado|Los dos valores)/.test(e.message);console.error(allowed?e.message:'No se pudo completar la comparación. Revisa Vault, Auth0 y la conexión privada.');process.exitCode=1;});
