import 'dotenv/config';
import bcrypt from 'bcryptjs';
import {pool,rows} from '../src/db.js';
import {dateToday} from '../src/utils.js';
const email=process.env.DEMO_EMAIL||'admin@aynisalud.local';
const password=process.env.DEMO_PASSWORD;
if(!password||password.length<10){console.error('Configura DEMO_PASSWORD con al menos 10 caracteres en .env');process.exit(1);}
const plus=(n)=>new Date(Date.parse(dateToday()+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const userByEmail=async(n,correo,rol)=>{
 const [r]=await rows('SELECT id_rol FROM roles WHERE nombre_rol=?',[rol]);if(!r)throw Error('No existe el rol '+rol);
 let [u]=await rows('SELECT id_usuario FROM usuarios WHERE correo=?',[correo]);if(u)return u.id_usuario;
 const hash=await bcrypt.hash(password,12);const result=await rows('INSERT INTO usuarios (id_rol,nombre_completo,correo,contrasena_hash,estado) VALUES (?,?,?,?,1)',[r.id_rol,n,correo,hash]);return result.insertId;
};
try{
 for(const role of ['administrador','enfermero','cuidador','medico','familiar']) await rows('INSERT IGNORE INTO roles (nombre_rol) VALUES (?)',[role]);
 const admin=await userByEmail('Administrador de prueba',email,'administrador');
 const enfermero=await userByEmail('Elena Vargas (ficticia)','enfermeria@aynisalud.local','enfermero');
 await userByEmail('Mario Blanco (ficticio)','medico@aynisalud.local','medico');
 await userByEmail('Luz Rojas (ficticia)','cuidador@aynisalud.local','cuidador');
 const familiar=await userByEmail('Sara Flores (ficticia)','familiar@aynisalud.local','familiar');
 let rs=await rows('SELECT id_residente FROM residentes LIMIT 1');
 if(!rs.length){
  await rows('INSERT INTO residentes (id_familiar_tutor,nombres,apellidos,fecha_nacimiento,numero_habitacion,alergias,condiciones_medicas,fecha_ingreso,estado) VALUES (?,?,?,?,?,?,?,?,1)',[familiar,'Elisa','Quispe (ficticia)','1944-05-11','101','Sin datos confirmados','Ejemplo académico: sin diagnóstico real',plus(-100)]);
  await rows('INSERT INTO residentes (id_familiar_tutor,nombres,apellidos,fecha_nacimiento,numero_habitacion,alergias,condiciones_medicas,fecha_ingreso,estado) VALUES (?,?,?,?,?,?,?,?,1)',[null,'Roberto','Pérez (ficticio)','1939-02-03','102','No registrado','Ejemplo académico: sin diagnóstico real',plus(-60)]);
  await rows('INSERT INTO residentes (id_familiar_tutor,nombres,apellidos,fecha_nacimiento,numero_habitacion,alergias,condiciones_medicas,fecha_ingreso,estado) VALUES (?,?,?,?,?,?,?,?,1)',[null,'Ana','Mamani (ficticia)','1948-09-23','103','No registrado','Ejemplo académico: sin diagnóstico real',plus(-20)]);
 }
 let drugs=await rows('SELECT id_farmaco FROM farmacos LIMIT 1');
 if(!drugs.length){for(const row of [['Fármaco demo A','Sustancia ficticia A','Comprimido demo',25],['Fármaco demo B','Sustancia ficticia B','Solución demo',15]])await rows('INSERT INTO farmacos (nombre_comercial,principio_activo,presentacion,stock_disponible) VALUES (?,?,?,?)',row);}
 const allR=await rows('SELECT id_residente FROM residentes ORDER BY id_residente LIMIT 3'),allD=await rows('SELECT id_farmaco FROM farmacos ORDER BY id_farmaco LIMIT 2');
 let schemes=await rows('SELECT COUNT(*) AS c FROM esquemas_medicacion');
 if(!schemes[0].c&&allR.length&&allD.length){
  await rows('INSERT INTO esquemas_medicacion (id_residente,id_farmaco,dosis,via_administracion,frecuencia_horas,hora_inicio,fecha_inicio,fecha_fin) VALUES (?,?,?,?,?,?,?,?)',[allR[0].id_residente,allD[0].id_farmaco,'Dosis ficticia A','Oral',8,'08:00',plus(-1),plus(30)]);
  await rows('INSERT INTO esquemas_medicacion (id_residente,id_farmaco,dosis,via_administracion,frecuencia_horas,hora_inicio,fecha_inicio,fecha_fin) VALUES (?,?,?,?,?,?,?,?)',[allR[Math.min(1,allR.length-1)].id_residente,allD[Math.min(1,allD.length-1)].id_farmaco,'Dosis ficticia B','Oral',12,'09:00',plus(-1),plus(30)]);
 }
 let meals=await rows('SELECT COUNT(*) c FROM registros_alimentacion WHERE fecha_hora_programada>=? AND fecha_hora_programada<?',[dateToday()+' 00:00:00',dateToday()+' 23:59:59']);
 if(!meals[0].c){
  for(const r of allR) for(const [tipo,hora] of [['Desayuno','08:30'],['Almuerzo','12:30'],['Merienda','16:30'],['Cena','19:30']]) await rows('INSERT INTO registros_alimentacion (id_residente,id_cuidador,tipo_comida,tipo_dieta,fecha_hora_programada,estado) VALUES (?,?,?,?,?,?)',[r.id_residente,enfermero,tipo,'Normal (ejemplo)',dateToday()+' '+hora+':00','Pendiente']);
 }
 let signs=await rows('SELECT COUNT(*) c FROM signos_vitales');
 if(!signs[0].c&&allR.length)await rows('INSERT INTO signos_vitales (id_residente,id_enfermero,presion_arterial,frecuencia_cardiaca,saturacion_oxigeno,glucemia,fecha_registro) VALUES (?,?,?,?,?,?,?)',[allR[0].id_residente,enfermero,'120/80',74,97,100,dateToday()+' 08:15:00']);
 console.log('DATOS SINTÉTICOS listos. Accesos:');
 console.log(`Admin: ${email}`);
 console.log('Enfermería: enfermeria@aynisalud.local');
 console.log('Médico: medico@aynisalud.local');
 console.log('Cuidador: cuidador@aynisalud.local');
 console.log('Familiar: familiar@aynisalud.local');
 console.log('Todos usan DEMO_PASSWORD configurado en .env. Cambia/borra estas cuentas fuera del laboratorio.');
} catch(e){console.error('No se pudo cargar la demo:',e.message);process.exitCode=1;} finally{await pool.end();}
