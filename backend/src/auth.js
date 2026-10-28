import jwt from 'jsonwebtoken';
import {rows} from './db.js';
import {HttpError} from './utils.js';
export function tokenFor(u){return jwt.sign({sub:u.id_usuario,rol:u.nombre_rol},process.env.JWT_SECRET,{expiresIn:'8h'});}
export async function authenticate(req,res,next){try{
 const bearer=req.headers.authorization?.match(/^Bearer (.+)$/);
 if(!bearer)throw new HttpError(401,'Inicia sesión para continuar.');
 const data=jwt.verify(bearer[1],process.env.JWT_SECRET,{algorithms:['HS256']});
 const r=await rows('SELECT u.id_usuario,u.id_rol,u.nombre_completo,u.correo,u.estado,r.nombre_rol FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol WHERE u.id_usuario=?',[data.sub]);
 if(!r.length||!r[0].estado)throw new HttpError(401,'Tu sesión ya no es válida.');
 req.user=r[0];next();
 }catch(e){next(e instanceof HttpError?e:new HttpError(401,'Sesión caducada o inválida.'));}}
export function roles(...allowed){return(req,res,next)=>allowed.includes(req.user.nombre_rol)?next():next(new HttpError(403,'No tienes permiso para esta acción.'));}
export async function canResident(user,resident){const r=await rows('SELECT id_residente FROM residentes WHERE id_residente=?'+(user.nombre_rol==='familiar'?' AND id_familiar_tutor=?':''),user.nombre_rol==='familiar'?[resident,user.id_usuario]:[resident]);if(!r.length)throw new HttpError(404,'Residente no encontrado o sin acceso.');}
export const isFamily=u=>u.nombre_rol==='familiar';
