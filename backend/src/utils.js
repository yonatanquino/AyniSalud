export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
export const bad=(msg)=>{throw new HttpError(400,msg);};
export function required(body,fields){for(const f of fields){if(body[f]===undefined||body[f]===null||String(body[f]).trim()==='')bad(`Completa el campo: ${f}`);}}
export const digits=(value,min=0,max=999999)=>{const n=Number(value);if(!Number.isInteger(n)||n<min||n>max) bad(`El valor debe estar entre ${min} y ${max}.`);return n;};
export const id=(v)=>digits(v,1,2147483647);
export const str=(v,max=255)=>String(v??'').trim().slice(0,max);
export const onlyDate=(v)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||isNaN(Date.parse(v+'T00:00:00Z')))bad('Fecha inválida (AAAA-MM-DD).');return v;};
export const onlyTime=(v)=>{const s=String(v??'');if(!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(s))bad('Hora inválida (HH:mm).');return s.substring(0,5);};
export const onlyDatetime=(v)=>{const s=String(v??'').replace('T',' ').slice(0,19);if(!/^\d{4}-\d{2}-\d{2} ([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(s))bad('Fecha y hora inválidas.');return s.length===16?s+':00':s;};
export function dateToday(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/La_Paz',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${v.year}-${v.month}-${v.day}`;}
export function nowBolivia(){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'America/La_Paz',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const d=Object.fromEntries(p.map(x=>[x.type,x.value]));return `${d.year}-${d.month}-${d.day} ${d.hour}:${d.minute}:${d.second}`;}
export function displayEstado(fecha, final=null){if(final==='Administrado'||final==='Entregada'||final==='Omitido'||final==='Omitida')return final;const mins=(Date.parse(fecha.replace(' ','T')+'Z')-Date.parse(nowBolivia().replace(' ','T')+'Z'))/60000;if(mins< -30)return 'Retrasado';if(mins<=30&&mins>=-30)return 'En ventana';if(mins<=60)return 'Proximo';return 'Pendiente';}
export function scheduleDay(s,day){
 // Wall-clock de La Paz, sin cambios de horario de verano: cálculos en UTC ficticio.
 const start=Date.parse(`${s.fecha_inicio}T${String(s.hora_inicio).slice(0,8)}Z`);
 const low=Date.parse(day+'T00:00:00Z'), high=low+86400000;
 const end=Date.parse(s.fecha_fin+'T23:59:59Z');
 const step=Number(s.frecuencia_horas)*3600000;
 if(!start||!step||end<low||start>=high)return [];
 const i=Math.max(0,Math.ceil((low-start)/step)); const output=[];
 for(let at=start+i*step;at<high&&at<=end;at+=step) output.push(new Date(at).toISOString().replace('T',' ').slice(0,19));
 return output;
}
export const respond=(fn)=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
