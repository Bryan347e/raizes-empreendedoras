import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createWorker } from './worker.js';
import { UNITS } from '../src/catalog.js';

class D1 {
  db = new DatabaseSync(':memory:');
  async exec(sql) { this.db.exec(sql); }
  prepare(sql) {
    const statement = this.db.prepare(sql); let params = [];
    const prepared = {
      bind(...values) { assert.ok(values.length <= 100); params = values; return prepared; },
      async first() { return statement.get(...params) || null; },
      async all() { return { results:statement.all(...params) }; },
      async run() { return statement.run(...params); }
    };
    return prepared;
  }
  async batch(statements) { this.db.exec('BEGIN'); try { const results=[]; for (const s of statements) results.push(await s.run()); this.db.exec('COMMIT'); return results; } catch(e) { this.db.exec('ROLLBACK'); throw e; } }
}
const pair = await generateKeyPair('RS256');
const jwk = { ...await exportJWK(pair.publicKey), kid:'test-key', alg:'RS256', use:'sig' };
const clientId='123-test.apps.googleusercontent.com';
const origin='https://test.pages.dev';
const business = { name:'Marca de teste', category:'Alimentação', description:'Brownies artesanais feitos por estudantes para presentear.', products:[{name:'Brownie',price:8}], student:'Aluno Exemplo', unit:UNITS[0], contact:'contato@example.invalid', city:'São Paulo', neighborhood:'Santana', location:{latitude:-23.501234,longitude:-46.632345} };

test('contas reais exigem JWT assinado, nonce, audiência, e-mail confirmado e sessão válida', async () => {
  let clock = Date.now();
  const worker = createWorker({ clock:()=>clock, fetcher:async()=>Response.json({keys:[jwk]}) });
  const env = { DB:new D1(), GOOGLE_CLIENT_ID:clientId, ASSETS:{fetch:()=>new Response('asset')} };
  const call = (path, method='GET', body, cookies='', headers={}) => worker.fetch(new Request(origin+'/api/'+path,{method,headers:{...(method!=='GET'?{'origin':origin,'x-raizes-request':'1','content-type':'application/json'}:{}),cookie:cookies,...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})}),env);
  const challenge=await call('auth/challenge'), nonce=(await challenge.json()).nonce;
  const nonceCookie=challenge.headers.get('set-cookie').split(';')[0];
  const signed = async (extra={}, key=pair.privateKey) => new SignJWT({email:'private@example.invalid',email_verified:true,name:'Aluno Exemplo',nonce,...extra}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setSubject('google-sub-1').setIssuer('https://accounts.google.com').setAudience(extra.aud || clientId).setIssuedAt(Math.floor(clock/1000)).setExpirationTime(Math.floor(clock/1000)+3600).sign(key);
  assert.equal((await call('businesses','POST',{business})).status,401);
  assert.equal((await call('auth/google','POST',{credential:await signed({nonce:'wrong'})},nonceCookie)).status,401);
  assert.equal((await call('auth/google','POST',{credential:await signed({email_verified:false})},nonceCookie)).status,401);
  assert.equal((await call('auth/google','POST',{credential:await signed({aud:'other'})},nonceCookie)).status,401);
  const other = await generateKeyPair('RS256');
  assert.equal((await call('auth/google','POST',{credential:await signed({},other.privateKey)},nonceCookie)).status,401);
  const credential=await signed();
  const login=await call('auth/google','POST',{credential},nonceCookie);
  assert.equal(login.status,200);
  const user=(await login.json()).user;
  assert.equal(user.email,'private@example.invalid');
  const session=login.headers.getSetCookie().find(c=>c.startsWith('__Host-raizes_session=')).split(';')[0];
  assert.match(login.headers.getSetCookie()[0],/HttpOnly; Secure; SameSite=Lax/);
  assert.equal((await call('auth/google','POST',{credential},nonceCookie)).status,401,'nonce cannot replay');
  assert.equal((await call('session','GET',undefined,session)).status,200);
  const csrf=await call('businesses','POST',{business},session,{'origin':'https://evil.invalid'});
  assert.equal(csrf.status,403);
  assert.equal((await call('businesses','POST',{business:{...business,products:[{name:'Brownie',price:-2}]}},session)).status,400);
  assert.equal((await call('businesses','POST',{business,images:['data:image/png;base64,YmFk']},session)).status,400);
  const created=await call('businesses','POST',{business:{...business,ownerId:'forged'}},session);
  assert.equal(created.status,201);
  const item=(await created.json()).business;
  assert.equal(item.ownerId,user.id);
  assert.deepEqual(item.location,{latitude:-23.5,longitude:-46.63});
  const list=await (await call('businesses')).json();
  assert.equal(list.businesses.length,1);
  assert.ok(!JSON.stringify(list).includes('private@example.invalid'));
  assert.equal((await (await call('my-businesses','GET',undefined,session)).json()).businesses.length,1);
  const oversized=await call('businesses','POST',{business,padding:'x'.repeat(1600001)},session);
  assert.equal(oversized.status,413);
  clock+=8*24*3600000;
  assert.equal((await (await call('session','GET',undefined,session)).json()).user,null);
  assert.equal((await call('businesses','POST',{business},session)).status,401);
});

test('sem configuração o serviço informa pendência e os recursos estáticos continuam disponíveis',async()=>{
  const worker=createWorker(); const env={ASSETS:{fetch:()=>new Response('ok')}};
  const status=await worker.fetch(new Request(origin+'/api/session'),env);
  assert.equal((await status.json()).authReady,false);
  assert.equal(await (await worker.fetch(new Request(origin+'/'),env)).text(),'ok');
});
