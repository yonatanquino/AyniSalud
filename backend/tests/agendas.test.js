import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scheduleDay,onlyDate,onlyTime,onlyDatetime,displayEstado} from '../src/utils.js';
test('esquema cada 8 horas atraviesa el límite del día',()=>{
 const x={fecha_inicio:'2026-10-27',fecha_fin:'2026-10-30',hora_inicio:'08:00:00',frecuencia_horas:8};
 assert.deepEqual(scheduleDay(x,'2026-10-28'),['2026-10-28 00:00:00','2026-10-28 08:00:00','2026-10-28 16:00:00']);
});
test('no genera dosis fuera del rango',()=>{const x={fecha_inicio:'2026-10-27',fecha_fin:'2026-10-30',hora_inicio:'08:00:00',frecuencia_horas:24};assert.deepEqual(scheduleDay(x,'2026-10-26'),[]);assert.deepEqual(scheduleDay(x,'2026-10-31'),[]);});
test('dosis cada 24 h',()=>{const x={fecha_inicio:'2026-10-28',fecha_fin:'2026-10-30',hora_inicio:'09:00:00',frecuencia_horas:24};assert.deepEqual(scheduleDay(x,'2026-10-29'),['2026-10-29 09:00:00']);});
test('validación de formato fechas y horas',()=>{assert.equal(onlyDate('2026-10-28'),'2026-10-28');assert.equal(onlyTime('08:30'),'08:30');assert.equal(onlyDatetime('2026-10-28T08:30'),'2026-10-28 08:30:00');assert.throws(()=>onlyTime('25:00'));});
test('un estado final confirmado prevalece sobre alertas de demora',()=>{assert.equal(displayEstado('2026-01-01 08:00:00','Administrado'),'Administrado');assert.equal(displayEstado('2026-01-01 08:00:00','Omitido'),'Omitido');});
