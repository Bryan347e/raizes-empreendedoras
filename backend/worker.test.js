import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createWorker } from './worker.js';
import { UNITS } from '../src/catalog.js';

class D1 {
  db = new DatabaseSync(':memory:');
  async exec(sql) { this.db.exec(sql); }
  prepare(sql) {
    const statement = this.db.prepare(sql); let params = [];
    const prepared = {
      bind(...values) { assert.ok(values.length <= 100); params=values; return prepared; },
      async first() { return statement.get(...params) || null; },
      async all() { return {results:statement.all(...params)}; },
      async run() { return statement.run(...params); }
    };
    return prepared;
  }
  async batch(statements) {
    this.db.exec('BEGIN');
    try { const results=[]; for(const s of statements) results.push(await s.run()); this.db.exec('COMMIT'); return results; }
    catch(e) { this.db.exec('ROLLBACK'); throw e; }
  }
}
const origin='https://test.pages.dev';
const business={name:'Loja de teste',category:'Alimentação',description:'Brownies artesanais feitos por estudantes para presentear.',products:[{name:'Brownie',price:8}],student:'Ana Exemplo',unit:UNITS[0],contact:'contato@example.invalid',city:'São Paulo',neighborhood:'Santana',location:{latitude:-23.501234,longitude:-46.632345}};
function setup() {
  const env={DB:new D1(),ASSETS:{fetch:()=>new Response('asset')}};
  const worker=createWorker();
  const call=(path,method='GET',body,headers={})=>worker.fetch(new Request(origin+'/api/'+path,{method,headers:{...(method!=='GET'?{'origin':origin,'x-raizes-request':'1','content-type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})}),env);
  return {env,call};
}

test('pessoas diferentes publicam sem login, sem contas ou sessões, e cada loja mantém seu responsável',async()=>{
  const {env,call}=setup();
  const first=await call('businesses','POST',{business});
  assert.equal(first.status,201); assert.equal(first.headers.get('set-cookie'),null);
  const ana=(await first.json()).business;
  const second=await call('businesses','POST',{business:{...business,name:'Outra loja',student:'Bruno Exemplo',ownerId:'forged',email:'private@example.invalid'}});
  assert.equal(second.status,201);
  const bruno=(await second.json()).business;
  assert.notEqual(ana.id,bruno.id); assert.equal(ana.student,'Ana Exemplo'); assert.equal(bruno.student,'Bruno Exemplo');
  assert.equal((await (await call('businesses?ids='+ana.id)).json()).businesses[0].student,'Ana Exemplo');
  assert.deepEqual(ana.location,{latitude:-23.5,longitude:-46.63});
  const list=await (await call('businesses')).json();
  assert.equal(list.businesses.length,2); assert.ok(!JSON.stringify(list).includes('private@example.invalid')); assert.ok(!JSON.stringify(list).includes('forged'));
  assert.equal(env.DB.db.prepare('SELECT COUNT(*) AS n FROM users').get().n,0);
  assert.equal(env.DB.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,0);
  assert.equal((await call('auth/google','POST',{credential:'fake'})).status,404);
  assert.equal((await call('businesses','DELETE')).status,405);
  assert.equal((await call('businesses','PUT',{business})).status,405);
});

test('publicação valida campos, preço, imagens, origem e tamanho do corpo',async()=>{
  const {call}=setup();
  assert.equal((await call('businesses','POST',{business}, {origin:'https://evil.invalid'})).status,403);
  assert.equal((await call('businesses','POST',{business:{...business,products:[{name:'Brownie',price:-2}]}})).status,400);
  assert.equal((await call('businesses','POST',{business:{...business,student:''}})).status,400);
  assert.equal((await call('businesses','POST',{business,images:['data:image/png;base64,YmFk']})).status,400);
  assert.equal((await call('businesses','POST',{business,padding:'x'.repeat(1600001)})).status,413);
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=';
  const item=(await (await call('businesses','POST',{business,images:[png]})).json()).business;
  const image=await call(item.images[0].slice(4));
  assert.equal(image.status,200); assert.equal(image.headers.get('content-type'),'image/png');
});

test('limite diário usa hash e impede mais de 30 publicações por acesso',async()=>{
  const {env,call}=setup();
  for(let i=0;i<30;i++) assert.equal((await call('businesses','POST',{business},{'cf-connecting-ip':'203.0.113.1'})).status,201);
  assert.equal((await call('businesses','POST',{business},{'cf-connecting-ip':'203.0.113.1'})).status,429);
  assert.equal(env.DB.db.prepare('SELECT bucket FROM publication_limits').get().bucket.length,64);
});

test('anúncios da versão anterior continuam na listagem pública sem expor e-mail',async()=>{
  const {env,call}=setup(); await call('session');
  env.DB.db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run('legacy','old-id','private@example.invalid','Responsável Antigo',1);
  env.DB.db.prepare('INSERT INTO businesses VALUES (?,?,?,?)').run('old-business','legacy',JSON.stringify({...business,id:'old-business'}),1);
  const list=await (await call('businesses')).json();
  assert.equal(list.businesses[0].id,'old-business'); assert.ok(!JSON.stringify(list).includes('private@example.invalid'));
});

test('sem banco o serviço identifica a demonstração e mantém os arquivos estáticos',async()=>{
  const worker=createWorker(),env={ASSETS:{fetch:()=>new Response('ok')}};
  assert.deepEqual(await (await worker.fetch(new Request(origin+'/api/session'),env)).json(),{shared:false});
  assert.equal(await (await worker.fetch(new Request(origin+'/'),env)).text(),'ok');
});

