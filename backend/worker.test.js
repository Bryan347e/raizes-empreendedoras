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
  assert.equal((await call('businesses','POST',{business,padding:'x'.repeat(20000001)})).status,413);
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=';
  const item=(await (await call('businesses','POST',{business,images:[png]})).json()).business;
  const image=await call(item.images[0].slice(4));
  assert.equal(image.status,200); assert.equal(image.headers.get('content-type'),'image/png');
});

test('cada produto mantém até três fotos independentes da marca, inclusive após reler o anúncio', async()=>{
  const {call}=setup();
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=';
  const products=Array.from({length:12},(_,i)=>({name:`Bolo ${i+1}`,price:10+i,images:[png,png,png]}));
  assert.equal((await call('businesses','POST',{business:{...business,products:[{...products[0],images:[png,png,png,png]}]}})).status,400);
  assert.equal((await call('businesses','POST',{business:{...business,products:[{...products[0],images:['data:image/png;base64,YmFk']}]}})).status,400);
  const response=await call('businesses','POST',{business:{...business,products},images:[png,png,png]});
  assert.equal(response.status,201);
  const saved=(await response.json()).business;
  const read=(await (await call(`businesses?ids=${saved.id}`)).json()).businesses[0];
  assert.equal(read.images.length,3); assert.equal(read.products.length,12);
  assert.deepEqual(read.products.map(p=>p.price),products.map(p=>p.price));
  assert.ok(read.products.every(p=>p.images.length===3));
  const all=[...read.images,...read.products.flatMap(p=>p.images)];
  assert.equal(new Set(all).size,39);
  for (const path of all) assert.equal((await call(path.slice(4))).status,200);
});

test('somente a chave de um anúncio permite excluí-lo, removendo produtos e fotos sem atingir outras lojas', async()=>{
  const {env,call}=setup();
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=';
  const token='a'.repeat(64), otherToken='b'.repeat(64);
  const saved=(await (await call('businesses','POST',{business:{...business,products:[{name:'Chocolate',price:20,images:[png]}]},images:[png],managementToken:token})).json()).business;
  const other=(await (await call('businesses','POST',{business,managementToken:otherToken})).json()).business;
  assert.equal((await call(`businesses/${saved.id}`,'DELETE')).status,403);
  assert.equal((await call(`businesses/${saved.id}`,'DELETE',undefined,{'x-raizes-management':otherToken})).status,403);
  assert.equal((await call(`businesses/${saved.id}`,'DELETE',undefined,{'x-raizes-management':token,origin:'https://evil.invalid'})).status,403);
  const publicList=JSON.stringify(await (await call('businesses')).json());
  assert.ok(!publicList.includes(token)); assert.ok(!publicList.includes('token_hash'));
  assert.notEqual(env.DB.db.prepare('SELECT token_hash FROM business_management WHERE business_id=?').get(saved.id).token_hash,token);
  assert.equal((await call(`businesses/${saved.id}`,'DELETE',undefined,{'x-raizes-management':token})).status,200);
  assert.deepEqual((await (await call('businesses')).json()).businesses.map(b=>b.id),[other.id]);
  for(const image of [...saved.images,...saved.products.flatMap(p=>p.images)]) assert.equal((await call(image.slice(4))).status,404);
  assert.equal(env.DB.db.prepare('SELECT COUNT(*) n FROM product_images').get().n,0);
  assert.equal((await call(`businesses/${other.id}`,'DELETE',undefined,{'x-raizes-management':token})).status,403);
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

test('edição e recuperação exigem a chave correta e preservam fotos e o ID do anúncio',async()=>{
  const {call}=setup(),token='c'.repeat(64),headers={'x-raizes-management':token};
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=';
  const saved=(await (await call('businesses','POST',{business:{...business,products:[{name:'Brownie',price:8,images:[png,png]}]},images:[png],managementToken:token})).json()).business;
  const other=(await (await call('businesses','POST',{business,images:[png],managementToken:'d'.repeat(64)})).json()).business;
  assert.equal((await call(`businesses/${saved.id}`,'PUT',{business})).status,403);
  assert.equal((await call(`businesses/${saved.id}/access`,'POST',undefined,{'x-raizes-management':'e'.repeat(64)})).status,403);
  const recovered=await (await call(`businesses/${saved.id}/access`,'POST',undefined,headers)).json();
  assert.equal(recovered.business.id,saved.id); assert.ok(!JSON.stringify(recovered).includes(token));
  assert.equal((await call(`businesses/${saved.id}`,'PUT',{business:{...business,name:'Inválido'},images:other.images},headers)).status,400);
  assert.equal((await call(`businesses/${saved.id}`,'PUT',{business:{...business,products:[{name:'Produto',price:-1}]}},headers)).status,400);
  const response=await call(`businesses/${saved.id}`,'PUT',{business:{...business,name:'Brownies atualizados',products:[{name:'Brownie novo',price:12,images:saved.products[0].images.slice(0,1)}]},images:saved.images},headers);
  assert.equal(response.status,200);
  const changed=(await response.json()).business;
  assert.equal(changed.id,saved.id);assert.equal(changed.createdAt,saved.createdAt); assert.equal(changed.name,'Brownies atualizados');
  assert.equal(changed.products[0].price,12); assert.equal(changed.images.length,1); assert.equal(changed.products[0].images.length,1);
  assert.equal((await call(changed.products[0].images[0].slice(4))).status,200);
  assert.equal((await call(saved.products[0].images[1].slice(4))).status,404);
  const list=(await (await call('businesses')).json()).businesses;
  assert.equal(list.length,2); assert.equal(list.find(b=>b.id===other.id).name,business.name);
  assert.equal((await call(`businesses/${saved.id}`,'DELETE',undefined,headers)).status,200);
});

test('reenvio após perda da resposta não duplica o anúncio e não permite tomar ID de outra loja',async()=>{
  const {call}=setup(),id=crypto.randomUUID(),token='f'.repeat(64);
  const body={business,businessId:id,managementToken:token};
  assert.equal((await call('businesses','POST',body)).status,201);
  const retry=await call('businesses','POST',{...body,business:{...business,name:'Não sobrescrever em repetição'}});
  assert.equal(retry.status,200); assert.equal((await retry.json()).business.name,business.name);
  assert.equal((await (await call('businesses')).json()).businesses.length,1);
  assert.equal((await call('businesses','POST',{...body,managementToken:'a'.repeat(64)})).status,409);
  assert.equal((await call('businesses','POST',{...body,businessId:'inválido'})).status,400);
});

