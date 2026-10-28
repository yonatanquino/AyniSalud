import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import {pool,rows} from './db.js';
import {authenticate,roles,tokenFor,canResident,isFamily} from './auth.js';
import {HttpError,bad,required,digits,id,str,onlyDate,onlyTime,onlyDatetime,dateToday,nowBolivia,displayEstado,scheduleDay,respond} from './utils.js';
import dotenv from 'dotenv';
dotenv.config();
const app=express();app.disable('x-powered-by');app.use(helmet());app.use(cors({origin:process.env.CORS_ORIGIN?.split(',')||['http://localhost:5173','http://127.0.0.1:5173']}));app.use(express.json({limit:'100kb'}));
const staff=['administrador','enfermero','cuidador','medico'];
const clinical=['administrador','enfermero','medico'];
const simpleUser='u.id_usuario,u.nombre_completo,u.correo,u.telefono,u.estado,r.nombre_rol';
const safeMail=v=>{const s=str(v,100).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))bad('Correo inválido.');return s;};
const bool=v=>v===true||v===1||v==='1'||v==='true'?1:0;
const dayParam=req=>onlyDate(req.query.fecha||dateToday());
const mustFutureOrToday=(from,to)=>{if(to<from)bad('La fecha final debe ser igual o posterior a la inicial.');};
app.get('/api/health',respond(async(req,res)=>{await rows('SELECT 1');res.json({ok:true,app:'AyniSalud',fecha:dateToday()});}));
app.post('/api/auth/login',rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Demasiados intentos. Prueba nuevamente en unos minutos.'}}),respond(async(req,res)=>{
 required(req.body,['correo','contrasena']);const correo=safeMail(req.body.correo);
 const u=await rows(`SELECT ${simpleUser},u.contrasena_hash FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol WHERE correo=?`,[correo]);
 if(!u.length||!u[0].estado||!(await bcrypt.compare(String(req.body.contrasena),u[0].contrasena_hash)))throw new HttpError(401,'Correo o contraseña incorrectos.');
 const {contrasena_hash,...user}=u[0];res.json({token:tokenFor(user),user});
}));
app.use('/api',authenticate);
app.get('/api/auth/me',(req,res)=>res.json({user:req.user}));
app.get('/api/roles',roles('administrador'),respond(async(req,res)=>res.json(await rows('SELECT * FROM roles ORDER BY id_rol'))));

// USUARIOS - solo administración. Nunca se retorna el hash.
app.get('/api/usuarios',roles('administrador'),respond(async(req,res)=>res.json(await rows(`SELECT ${simpleUser} FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol ORDER BY u.id_usuario DESC`))));
app.post('/api/usuarios',roles('administrador'),respond(async(req,res)=>{
 required(req.body,['id_rol','nombre_completo','correo','contrasena']);const {id_rol,nombre_completo,correo,contrasena,telefono}=req.body;
 if(String(contrasena).length<10)bad('La contraseña debe tener mínimo 10 caracteres.');
 const [role]=await rows('SELECT id_rol FROM roles WHERE id_rol=?',[id(id_rol)]);if(!role)bad('Rol inexistente.');
 const hash=await bcrypt.hash(String(contrasena),12);
 const r=await rows('INSERT INTO usuarios (id_rol,nombre_completo,correo,contrasena_hash,telefono,estado) VALUES (?,?,?,?,?,1)',[id(id_rol),str(nombre_completo,150),safeMail(correo),hash,str(telefono,20)||null]);res.status(201).json({id_usuario:r.insertId});
}));
app.put('/api/usuarios/:id',roles('administrador'),respond(async(req,res)=>{
 required(req.body,['nombre_completo','correo','id_rol']);const n=id(req.params.id);
 if(n===req.user.id_usuario&&req.body.estado!==undefined&&!bool(req.body.estado))bad('No puedes desactivar tu propio usuario.');
 const [r]=await rows('SELECT id_rol FROM roles WHERE id_rol=?',[id(req.body.id_rol)]);if(!r)bad('Rol inexistente.');
 await rows('UPDATE usuarios SET nombre_completo=?,correo=?,id_rol=?,telefono=?,estado=? WHERE id_usuario=?',[str(req.body.nombre_completo,150),safeMail(req.body.correo),id(req.body.id_rol),str(req.body.telefono,20)||null,bool(req.body.estado??true),n]);
 if(req.body.contrasena){if(String(req.body.contrasena).length<10)bad('Contraseña demasiado corta.');await rows('UPDATE usuarios SET contrasena_hash=? WHERE id_usuario=?',[await bcrypt.hash(String(req.body.contrasena),12),n]);}res.json({ok:true});
}));

// RESIDENTES
app.get('/api/residentes',respond(async(req,res)=>{
 const extra=isFamily(req.user)?' WHERE re.id_familiar_tutor=?':'';
 const sql=`SELECT re.*,u.nombre_completo AS nombre_tutor FROM residentes re LEFT JOIN usuarios u ON u.id_usuario=re.id_familiar_tutor ${extra} ORDER BY re.estado DESC,re.apellidos,re.nombres`;
 res.json(await rows(sql,isFamily(req.user)?[req.user.id_usuario]:[]));
}));
app.get('/api/residentes/:id',respond(async(req,res)=>{
 const rid=id(req.params.id);await canResident(req.user,rid);
 const a=await rows('SELECT re.*,u.nombre_completo AS nombre_tutor FROM residentes re LEFT JOIN usuarios u ON u.id_usuario=re.id_familiar_tutor WHERE re.id_residente=?',[rid]);res.json(a[0]);
}));
async function checkedTutor(v){if(v===null||v===undefined||v==='')return null;const t=await rows('SELECT u.id_usuario FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol WHERE u.id_usuario=? AND u.estado=1 AND r.nombre_rol=?',[id(v),'familiar']);if(!t.length)bad('El tutor seleccionado no tiene un usuario familiar activo.');return id(v);}
function residentBody(b){required(b,['nombres','apellidos','fecha_nacimiento','numero_habitacion','fecha_ingreso']);const f=onlyDate(b.fecha_nacimiento),ing=onlyDate(b.fecha_ingreso);if(f>dateToday())bad('La fecha de nacimiento no puede ser futura.');if(ing<f)bad('El ingreso debe ser posterior al nacimiento.');return [str(b.nombres,100),str(b.apellidos,100),f,str(b.numero_habitacion,20),str(b.alergias,5000)||null,str(b.condiciones_medicas,5000)||null,ing];}
app.post('/api/residentes',roles('administrador'),respond(async(req,res)=>{
 const b=residentBody(req.body),t=await checkedTutor(req.body.id_familiar_tutor);
 const r=await rows('INSERT INTO residentes (nombres,apellidos,fecha_nacimiento,numero_habitacion,alergias,condiciones_medicas,fecha_ingreso,id_familiar_tutor,estado) VALUES (?,?,?,?,?,?,?,?,1)',[...b,t]);res.status(201).json({id_residente:r.insertId});
}));
app.put('/api/residentes/:id',roles('administrador'),respond(async(req,res)=>{
 const rid=id(req.params.id);await canResident(req.user,rid);const b=residentBody(req.body),t=await checkedTutor(req.body.id_familiar_tutor);
 await rows('UPDATE residentes SET nombres=?,apellidos=?,fecha_nacimiento=?,numero_habitacion=?,alergias=?,condiciones_medicas=?,fecha_ingreso=?,id_familiar_tutor=?,estado=? WHERE id_residente=?',[...b,t,bool(req.body.estado??true),rid]);res.json({ok:true});
}));

// FÁRMACOS: catálogo, stock es informativo (la unidad de dosis no permite descuento automático fiable).
app.get('/api/farmacos',roles(...staff),respond(async(req,res)=>res.json(await rows('SELECT * FROM farmacos ORDER BY nombre_comercial'))));
async function saveFarmaco(req,res,update=false){const b=req.body;required(b,['nombre_comercial','principio_activo','presentacion']);const vals=[str(b.nombre_comercial,150),str(b.principio_activo,150),str(b.presentacion,50),digits(b.stock_disponible??0,0,10000000)];if(update){await rows('UPDATE farmacos SET nombre_comercial=?,principio_activo=?,presentacion=?,stock_disponible=? WHERE id_farmaco=?',[...vals,id(req.params.id)]);res.json({ok:true});}else{const r=await rows('INSERT INTO farmacos (nombre_comercial,principio_activo,presentacion,stock_disponible) VALUES (?,?,?,?)',vals);res.status(201).json({id_farmaco:r.insertId});}}
app.post('/api/farmacos',roles('administrador','medico'),respond((req,res)=>saveFarmaco(req,res)));
app.put('/api/farmacos/:id',roles('administrador','medico'),respond((req,res)=>saveFarmaco(req,res,true)));

// ESQUEMAS DE MEDICACIÓN
app.get('/api/esquemas',respond(async(req,res)=>{
 const sql=`SELECT e.*,re.nombres,re.apellidos,re.numero_habitacion,f.nombre_comercial,f.principio_activo
 FROM esquemas_medicacion e JOIN residentes re ON re.id_residente=e.id_residente JOIN farmacos f ON f.id_farmaco=e.id_farmaco ${isFamily(req.user)?'WHERE re.id_familiar_tutor=?':''} ORDER BY e.fecha_fin DESC,e.id_esquema DESC`;
 res.json(await rows(sql,isFamily(req.user)?[req.user.id_usuario]:[]));
}));
async function esquemaBody(b){required(b,['id_residente','id_farmaco','dosis','via_administracion','frecuencia_horas','hora_inicio','fecha_inicio','fecha_fin']);const residente=id(b.id_residente);const farmaco=id(b.id_farmaco);const inicio=onlyDate(b.fecha_inicio),fin=onlyDate(b.fecha_fin);mustFutureOrToday(inicio,fin);const fc=await rows('SELECT id_farmaco FROM farmacos WHERE id_farmaco=?',[farmaco]);if(!fc.length)bad('Fármaco inexistente.');return [residente,farmaco,str(b.dosis,50),str(b.via_administracion,50),digits(b.frecuencia_horas,1,168),onlyTime(b.hora_inicio),inicio,fin];}
app.post('/api/esquemas',roles('administrador','medico'),respond(async(req,res)=>{
 const b=await esquemaBody(req.body);await canResident(req.user,b[0]);const r=await rows('INSERT INTO esquemas_medicacion (id_residente,id_farmaco,dosis,via_administracion,frecuencia_horas,hora_inicio,fecha_inicio,fecha_fin) VALUES (?,?,?,?,?,?,?,?)',b);res.status(201).json({id_esquema:r.insertId});
}));
app.put('/api/esquemas/:id',roles('administrador','medico'),respond(async(req,res)=>{
 const n=id(req.params.id);const old=await rows('SELECT * FROM esquemas_medicacion WHERE id_esquema=?',[n]);if(!old.length)throw new HttpError(404,'Esquema no encontrado.');
 const b=await esquemaBody(req.body);await canResident(req.user,b[0]);
 const entries=await rows('SELECT COUNT(*) AS n FROM registros_medicacion WHERE id_esquema=?',[n]);
 if(entries[0].n) bad('Este esquema tiene administraciones registradas: para conservar la trazabilidad histórica, crea uno nuevo en vez de modificarlo.');
 await rows('UPDATE esquemas_medicacion SET id_residente=?,id_farmaco=?,dosis=?,via_administracion=?,frecuencia_horas=?,hora_inicio=?,fecha_inicio=?,fecha_fin=? WHERE id_esquema=?',[...b,n]);res.json({ok:true});
}));
async function agendaFor(user,day){
 const schema=await rows(`SELECT e.*,re.nombres,re.apellidos,re.numero_habitacion,re.id_familiar_tutor,f.nombre_comercial,f.principio_activo FROM esquemas_medicacion e JOIN residentes re ON re.id_residente=e.id_residente JOIN farmacos f ON f.id_farmaco=e.id_farmaco WHERE e.fecha_inicio<=? AND e.fecha_fin>=? AND re.estado=1 ${isFamily(user)?'AND re.id_familiar_tutor=?':''}`,
 isFamily(user)?[day,day,user.id_usuario]:[day,day]);
 const records=await rows(`SELECT m.* FROM registros_medicacion m JOIN esquemas_medicacion e ON e.id_esquema=m.id_esquema JOIN residentes re ON re.id_residente=e.id_residente WHERE m.fecha_programada>=? AND m.fecha_programada<? ${isFamily(user)?'AND re.id_familiar_tutor=?':''}`,isFamily(user)?[day+' 00:00:00',day+' 23:59:59',user.id_usuario]:[day+' 00:00:00',day+' 23:59:59']);
 const map=new Map(records.map(r=>[r.id_esquema+'|'+r.fecha_programada,r]));
 return schema.flatMap(s=>scheduleDay(s,day).map(h=>{
 const rec=map.get(s.id_esquema+'|'+h);
 return {id_esquema:s.id_esquema,id_residente:s.id_residente,residente:s.nombres+' '+s.apellidos,habitacion:s.numero_habitacion,farmaco:s.nombre_comercial,principio_activo:s.principio_activo,dosis:s.dosis,via:s.via_administracion,fecha_programada:h,fecha_administrada:rec?.fecha_administrada||null,observaciones:rec?.observaciones||null,estado:displayEstado(h,rec?.estado_alerta),id_registro_med:rec?.id_registro_med||null};
 })).sort((a,b)=>a.fecha_programada.localeCompare(b.fecha_programada));
}
app.get('/api/medicacion/agenda',respond(async(req,res)=>res.json(await agendaFor(req.user,dayParam(req)))));
app.post('/api/medicacion/registro',roles('administrador','enfermero'),respond(async(req,res)=>{
 required(req.body,['id_esquema','fecha_programada','estado']);const eid=id(req.body.id_esquema),fecha=onlyDatetime(req.body.fecha_programada),estado=str(req.body.estado,20),obs=str(req.body.observaciones,2000);
 if(!['Administrado','Omitido'].includes(estado))bad('Estado de medicación no válido.');if(estado==='Omitido'&&!obs)bad('Describe el motivo de la omisión.');
 const s=await rows('SELECT * FROM esquemas_medicacion WHERE id_esquema=?',[eid]);if(!s.length)throw new HttpError(404,'Esquema inexistente.');
 const authorized=scheduleDay(s[0],fecha.slice(0,10)).includes(fecha);if(!authorized)bad('La fecha no corresponde a una dosis programada.');
 const conn=await pool.getConnection();try{await conn.beginTransaction();const [record]=await conn.execute('SELECT id_registro_med FROM registros_medicacion WHERE id_esquema=? AND fecha_programada=? FOR UPDATE',[eid,fecha]);if(record.length)throw new HttpError(409,'Esta dosis ya fue registrada. Actualiza la agenda.');
 await conn.execute('INSERT INTO registros_medicacion (id_esquema,id_enfermero,fecha_programada,fecha_administrada,estado_alerta,observaciones) VALUES (?,?,?,?,?,?)',[eid,req.user.id_usuario,fecha,estado==='Administrado'?nowBolivia():null,estado,obs||null]);await conn.commit();res.status(201).json({ok:true});
 }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}));

// NUTRICIÓN
async function foodFor(user,day){const sql=`SELECT a.*,re.nombres,re.apellidos,re.numero_habitacion,c.nombre_completo AS registrado_por FROM registros_alimentacion a JOIN residentes re ON re.id_residente=a.id_residente JOIN usuarios c ON c.id_usuario=a.id_cuidador WHERE a.fecha_hora_programada>=? AND a.fecha_hora_programada<? ${isFamily(user)?'AND re.id_familiar_tutor=?':''} ORDER BY a.fecha_hora_programada ASC`;
 const data=await rows(sql,isFamily(user)?[day+' 00:00:00',day+' 23:59:59',user.id_usuario]:[day+' 00:00:00',day+' 23:59:59']);return data.map(x=>({...x,estado_visual:displayEstado(x.fecha_hora_programada,x.estado)}));}
app.get('/api/alimentacion',respond(async(req,res)=>res.json(await foodFor(req.user,dayParam(req)))));
app.post('/api/alimentacion',roles('administrador','enfermero','cuidador'),respond(async(req,res)=>{
 required(req.body,['id_residente','tipo_comida','tipo_dieta','fecha_hora_programada']);const b=req.body,rid=id(b.id_residente);await canResident(req.user,rid);
 if(!['Desayuno','Almuerzo','Merienda','Cena'].includes(b.tipo_comida))bad('Selecciona una comida válida.');
 const r=await rows('INSERT INTO registros_alimentacion (id_residente,id_cuidador,tipo_comida,tipo_dieta,fecha_hora_programada,estado) VALUES (?,?,?,?,?,?)',[rid,req.user.id_usuario,b.tipo_comida,str(b.tipo_dieta,100),onlyDatetime(b.fecha_hora_programada),'Pendiente']);res.status(201).json({id_registro_ali:r.insertId});
}));
app.patch('/api/alimentacion/:id/estado',roles('administrador','enfermero','cuidador'),respond(async(req,res)=>{
 const n=id(req.params.id),estado=str(req.body.estado,20);if(!['Entregada','Omitida'].includes(estado))bad('Estado no válido.');
 const con=await pool.getConnection();try{await con.beginTransaction();const [a]=await con.execute('SELECT estado FROM registros_alimentacion WHERE id_registro_ali=? FOR UPDATE',[n]);if(!a.length)throw new HttpError(404,'Comida no encontrada.');if(a[0].estado!=='Pendiente')throw new HttpError(409,'Esta comida ya tiene un estado final.');
 await con.execute('UPDATE registros_alimentacion SET estado=?,fecha_hora_entregada=? WHERE id_registro_ali=?',[estado,estado==='Entregada'?nowBolivia():null,n]);await con.commit();res.json({ok:true});}catch(e){await con.rollback();throw e;}finally{con.release();}
}));

// SIGNOS VITALES (historia por residente; sin umbrales ni decisiones clínicas automáticas).
app.get('/api/signos',roles('administrador','enfermero','medico','familiar'),respond(async(req,res)=>{
 const rid=req.query.id_residente? id(req.query.id_residente):null;if(rid)await canResident(req.user,rid);
 const conditions=[],args=[];if(rid){conditions.push('s.id_residente=?');args.push(rid);}if(isFamily(req.user)){conditions.push('re.id_familiar_tutor=?');args.push(req.user.id_usuario);}
 const out=await rows(`SELECT s.*,re.nombres,re.apellidos,u.nombre_completo AS registrado_por FROM signos_vitales s JOIN residentes re ON re.id_residente=s.id_residente JOIN usuarios u ON u.id_usuario=s.id_enfermero ${conditions.length?'WHERE '+conditions.join(' AND '):''} ORDER BY s.fecha_registro DESC LIMIT 100`,args);res.json(out);
}));
app.post('/api/signos',roles(...clinical),respond(async(req,res)=>{
 const b=req.body;required(b,['id_residente','presion_arterial','frecuencia_cardiaca','saturacion_oxigeno','glucemia']);const rid=id(b.id_residente);await canResident(req.user,rid);
 if(!/^\d{2,3}\/\d{2,3}$/.test(str(b.presion_arterial)))bad('La presión debe tener formato 120/80.');
 const vals=[rid,req.user.id_usuario,str(b.presion_arterial,20),digits(b.frecuencia_cardiaca,20,250),digits(b.saturacion_oxigeno,0,100),digits(b.glucemia,20,700),nowBolivia()];
 const r=await rows('INSERT INTO signos_vitales (id_residente,id_enfermero,presion_arterial,frecuencia_cardiaca,saturacion_oxigeno,glucemia,fecha_registro) VALUES (?,?,?,?,?,?,?)',vals);res.status(201).json({id_signo:r.insertId});
}));

// BITÁCORA DE GUARDIA (extensión del diagrama).
app.get('/api/bitacoras',roles(...staff),respond(async(req,res)=>{
 const a=await rows(`SELECT b.*,u.nombre_completo AS autor,re.nombres,re.apellidos FROM bitacoras_guardia b JOIN usuarios u ON u.id_usuario=b.id_usuario LEFT JOIN residentes re ON re.id_residente=b.id_residente ORDER BY b.fecha_registro DESC LIMIT 100`);res.json(a);
}));
app.post('/api/bitacoras',roles(...staff),respond(async(req,res)=>{
 required(req.body,['turno','nota']);const {turno,nota,id_residente}=req.body;if(!['Manana','Tarde','Noche'].includes(turno))bad('Turno inválido.');if(str(nota,5000).length<10)bad('La nota debe tener al menos 10 caracteres.');const rid=id_residente?id(id_residente):null;if(rid)await canResident(req.user,rid);
 const r=await rows('INSERT INTO bitacoras_guardia (id_usuario,id_residente,turno,nota,fecha_registro) VALUES (?,?,?,?,?)',[req.user.id_usuario,rid,turno,str(nota,5000),nowBolivia()]);res.status(201).json({id_bitacora:r.insertId});
}));

// PORTAL FAMILIAR solo recursos vinculados al usuario autenticado.
app.get('/api/familia/estado',roles('familiar'),respond(async(req,res)=>{
 const residents=await rows('SELECT id_residente,nombres,apellidos,numero_habitacion,alergias FROM residentes WHERE id_familiar_tutor=? AND estado=1',[req.user.id_usuario]);const d=dateToday();const medications=await agendaFor(req.user,d),meals=await foodFor(req.user,d);
 const signs=await rows('SELECT s.*,re.nombres,re.apellidos FROM signos_vitales s JOIN residentes re ON re.id_residente=s.id_residente WHERE re.id_familiar_tutor=? ORDER BY s.fecha_registro DESC LIMIT 15',[req.user.id_usuario]);res.json({residentes:residents,medicaciones:medications,alimentacion:meals,signos:signs,fecha:d});
}));

app.get('/api/dashboard',respond(async(req,res)=>{
 const date=dayParam(req);const medications=await agendaFor(req.user,date),meals=await foodFor(req.user,date);
 const r=await rows(`SELECT COUNT(*) total FROM residentes ${isFamily(req.user)?'WHERE id_familiar_tutor=? AND estado=1':'WHERE estado=1'}`,isFamily(req.user)?[req.user.id_usuario]:[]);
 res.json({fecha:date,residentes:r[0].total,medicamentos:medications,alimentacion:meals,medTotal:medications.length,medCompletados:medications.filter(x=>x.estado==='Administrado').length,medAtrasados:medications.filter(x=>x.estado==='Retrasado').length,comidasTotal:meals.length,comidasCompletadas:meals.filter(x=>x.estado==='Entregada').length});
}));

// INFORMES en vista web; botón imprimir / guardar como PDF en el navegador.
app.get('/api/reportes',roles('administrador','medico'),respond(async(req,res)=>{
 const desde=onlyDate(req.query.desde||dateToday()),hasta=onlyDate(req.query.hasta||dateToday());mustFutureOrToday(desde,hasta);
 const days=(Date.parse(hasta+'T00:00:00Z')-Date.parse(desde+'T00:00:00Z'))/86400000;
 if(days>60)bad('Selecciona un periodo máximo de 61 días.');const medication=[],food=[];
 for(let i=0;i<=days;i++){const d=new Date(Date.parse(desde+'T00:00:00Z')+i*86400000).toISOString().slice(0,10);medication.push(...await agendaFor(req.user,d));food.push(...await foodFor(req.user,d));}
 const totals={medProgramadas:medication.length,medAdministradas:medication.filter(x=>x.estado==='Administrado').length,medOmitidas:medication.filter(x=>x.estado==='Omitido').length,medRetrasadas:medication.filter(x=>x.estado==='Retrasado').length,comidasProgramadas:food.length,comidasEntregadas:food.filter(x=>x.estado==='Entregada').length,comidasOmitidas:food.filter(x=>x.estado==='Omitida').length};
 res.json({desde,hasta,totals,medication,food});
}));

app.use((req,res)=>res.status(404).json({error:'Ruta no encontrada.'}));
app.use((err,req,res,next)=>{
 if(err.code==='ER_DUP_ENTRY')return res.status(409).json({error:'Ya existe un registro con esos datos (correo o evento duplicado).'});
 if(err.code==='ER_NO_REFERENCED_ROW_2')return res.status(400).json({error:'El registro relacionado no existe.'});
 if(err.code==='ER_ROW_IS_REFERENCED_2')return res.status(409).json({error:'No se puede eliminar: hay registros relacionados.'});
 if(err instanceof SyntaxError&&err.status===400)return res.status(400).json({error:'JSON inválido.'});
 console.error('[AyniSalud]',err.message);
 res.status(err.status>=400&&err.status<500?err.status:500).json({error:err.status>=400&&err.status<500?err.message:'Error interno. Revisa la conexión y los registros del servidor.'});
});
if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32||process.env.JWT_SECRET.includes('CAMBIA_ESTO')){console.error('ERROR: Configura JWT_SECRET seguro (mínimo 32 caracteres) en backend/.env');process.exit(1);}
const port=Number(process.env.PORT||4000);
pool.query('SELECT 1').then(()=>app.listen(port,()=>console.log(`AyniSalud API lista en http://localhost:${port}`))).catch(e=>{console.error('No se pudo conectar a MySQL:',e.message);process.exit(1);});
