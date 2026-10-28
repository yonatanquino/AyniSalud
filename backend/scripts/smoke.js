// Pruebas mínimas de integración (servidor y MySQL deben estar iniciados).
import 'dotenv/config';
const url='http://127.0.0.1:'+(process.env.PORT||4000)+'/api';
const pass=process.env.DEMO_PASSWORD;
if(!pass){console.error('Falta DEMO_PASSWORD en .env');process.exit(1);}
const check=(ok,label)=>{if(!ok)throw Error('FALLÓ: '+label);console.log('✓ '+label);};
async function req(path,method='GET',data,token){const r=await fetch(url+path,{method,headers:{...(token?{'Authorization':'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});let json;try{json=await r.json();}catch{json={}}return {status:r.status,data:json};}
try{
 const health=await req('/health');check(health.status===200&&health.data.ok,'Servidor y MySQL disponibles');
 const login=await req('/auth/login','POST',{correo:process.env.DEMO_EMAIL||'admin@aynisalud.local',contrasena:pass});check(login.status===200&&!!login.data.token,'Login administrador');
 const t=login.data.token;check((await req('/residentes','GET',null,t)).status===200,'Listar residentes');
 check((await req('/medicacion/agenda','GET',null,t)).status===200,'Generar agenda de medicación');
 check((await req('/alimentacion','GET',null,t)).status===200,'Listar alimentación');
 check((await req('/signos','GET',null,t)).status===200,'Consultar signos vitales');
 check((await req('/bitacoras','GET',null,t)).status===200,'Consultar bitácora');
 const familiar=await req('/auth/login','POST',{correo:'familiar@aynisalud.local',contrasena:pass});check(familiar.status===200,'Login familiar');
 const ft=familiar.data.token;check((await req('/familia/estado','GET',null,ft)).status===200,'Portal familiar autorizado');
 check((await req('/usuarios','GET',null,ft)).status===403,'Familiar no puede ver usuarios');
 check((await req('/residentes','GET',null)).status===401,'API requiere iniciar sesión');
 console.log('\nTodas las pruebas de humo pasaron.');
}catch(e){console.error(e.message);process.exit(1);}
