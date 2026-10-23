import test from 'node:test';
import assert from 'node:assert/strict';
import {groupBusinessesByResponsible, UNITS} from './catalog.js';
import {ownedBusinessIds} from './api.js';

test('meus anúncios só usa os IDs lembrados neste navegador e separa responsáveis',()=>{
  const businesses=[{id:'ana-1',student:'Ana Exemplo',unit:UNITS[0]},{id:'ana-2',student:'Ana Exemplo',unit:UNITS[0]},{id:'bruno',student:'Bruno Exemplo',unit:UNITS[0]},{id:'outra-pessoa',student:'Carla Exemplo',unit:UNITS[0]}];
  const ids=ownedBusinessIds({getItem:()=>JSON.stringify(['ana-1','ana-2','bruno'])});
  const groups=groupBusinessesByResponsible(businesses.filter(b=>ids.includes(b.id)));
  assert.deepEqual(groups.map(g=>[g.student,g.businesses.length]),[['Ana Exemplo',2],['Bruno Exemplo',1]]);
  assert.deepEqual(ownedBusinessIds({getItem:()=>null}),[]);
  assert.deepEqual(ownedBusinessIds({getItem:()=>'{broken'}),[]);
});

