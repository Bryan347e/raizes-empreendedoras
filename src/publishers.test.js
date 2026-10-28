import test from 'node:test';
import assert from 'node:assert/strict';
import {groupBusinessesByResponsible, UNITS, getCreatedBusinesses, saveBusiness} from './catalog.js';
import {ownedBusinessIds, account, publishBusiness, canDeleteBusiness, deleteBusiness, managementKeys, loadAccount, restoreAccess, recoveryCode} from './api.js';

test('meus anúncios só usa os IDs lembrados neste navegador e separa responsáveis',()=>{
  const businesses=[{id:'ana-1',student:'Ana Exemplo',unit:UNITS[0]},{id:'ana-2',student:'Ana Exemplo',unit:UNITS[0]},{id:'bruno',student:'Bruno Exemplo',unit:UNITS[0]},{id:'outra-pessoa',student:'Carla Exemplo',unit:UNITS[0]}];
  const ids=ownedBusinessIds({getItem:()=>JSON.stringify(['ana-1','ana-2','bruno'])});
  const groups=groupBusinessesByResponsible(businesses.filter(b=>ids.includes(b.id)));
  assert.deepEqual(groups.map(g=>[g.student,g.businesses.length]),[['Ana Exemplo',2],['Bruno Exemplo',1]]);
  assert.deepEqual(ownedBusinessIds({getItem:()=>null}),[]);
  assert.deepEqual(ownedBusinessIds({getItem:()=>'{broken'}),[]);
});

test('a chave de exclusão persiste no navegador, fica fora do anúncio e é enviada apenas ao excluir',async t=>{
  const originalStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),originalFetch=globalThis.fetch;
  const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});
  t.after(()=>{if(originalStorage) Object.defineProperty(globalThis,'localStorage',originalStorage);else delete globalThis.localStorage;globalThis.fetch=originalFetch;account.shared=false;account.businesses=[];});
  const business={id:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',name:'Teste',shared:true,products:[{name:'Bolo',price:10,images:['foto1','foto2']}]};
  let receipt;
  globalThis.fetch=async(url,options)=>{
    if(options.method==='POST') {receipt=JSON.parse(options.body); business.id=receipt.businessId; assert.ok(ownedBusinessIds().includes(business.id)); assert.equal(managementKeys()[business.id],receipt.managementToken); return Response.json({business},{status:201});}
    assert.equal(options.method,'DELETE'); assert.equal(url,`api/businesses/${business.id}`);
    assert.equal(options.headers['x-raizes-management'],receipt.managementToken);
    return Response.json({deleted:true});
  };
  account.loading=false; account.shared=true; account.businesses=[];
  const saved=await publishBusiness(business,[]);
  assert.equal(receipt.managementToken.length,64);
  assert.equal(managementKeys(storage)[saved.id],receipt.managementToken);
  assert.equal(saved.managementToken,undefined);
  assert.deepEqual(receipt.business.products[0].images,['foto1','foto2']);
  assert.equal(canDeleteBusiness(saved,storage),true);
  assert.equal(canDeleteBusiness(saved,{getItem:()=>null}),false);
  assert.equal(canDeleteBusiness({...saved,demo:true},storage),false);
  await deleteBusiness(saved);
  assert.deepEqual(ownedBusinessIds(storage),[]); assert.deepEqual(managementKeys(storage),{}); assert.equal(account.businesses.length,0);
});

test('anúncio local preserva as fotos por produto e pode ser excluído sem afetar outro anúncio',async t=>{
  const originalStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});
  t.after(()=>{if(originalStorage) Object.defineProperty(globalThis,'localStorage',originalStorage);else delete globalThis.localStorage;account.businesses=[];});
  const values={name:'Confeitaria teste',category:'Alimentação',description:'Bolos caseiros feitos com carinho para festas e presentes.',offerings:'Bolo de chocolate',student:'Ana Teste',unit:UNITS[0],contact:'teste@example.invalid',products:[{name:'Bolo de chocolate',price:25,images:['fotoChocolate']}]};
  const first=saveBusiness(values,['marca'],storage).business,second=saveBusiness({...values,name:'Outra loja'},[],storage).business;
  assert.equal(getCreatedBusinesses(storage)[1].products[0].images[0],'fotoChocolate');
  assert.equal(canDeleteBusiness(first,storage),true);
  await deleteBusiness(first);
  assert.deepEqual(getCreatedBusinesses(storage).map(b=>b.id),[second.id]);
});

test('Minhas lojas recupera pela chave mesmo sem a lista de IDs e após perder a resposta da publicação',async t=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),originalFetch=globalThis.fetch;
  const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>{if(key==='raizes:published-ids:v1')throw Error('IDs bloqueados');data.set(key,value);}};
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});
  t.after(()=>{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;globalThis.fetch=originalFetch;});
  const api=await import('./api.js?test-network-recovery');api.account.loading=false;api.account.shared=true;
  let posted;
  globalThis.fetch=async(url,options)=>{
    if(options.method==='POST'){posted=JSON.parse(options.body);assert.ok(api.ownedBusinessIds().includes(posted.businessId));throw new TypeError('Resposta perdida');}
    if(url==='api/session')return Response.json({shared:true});
    if(url==='api/businesses')return Response.json({businesses:[]});
    assert.equal(url,'api/businesses?ids='+posted.businessId);
    return Response.json({businesses:[{...posted.business,id:posted.businessId,shared:true}]});
  };
  await assert.rejects(api.publishBusiness({name:'Marca publicada'},[]),/Resposta perdida/);
  const reloaded=await import('./api.js?test-reloaded-browser');
  await reloaded.loadAccount();
  assert.equal(reloaded.account.businesses[0].id,posted.businessId);
  assert.equal(reloaded.canDeleteBusiness(reloaded.account.businesses[0]),true);
  const code=reloaded.recoveryCode(reloaded.account.businesses[0]);assert.ok(code.startsWith('raizes1.'));
  data.clear();
  const otherBrowser=await import('./api.js?test-other-browser');
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,`api/businesses/${posted.businessId}/access`);
    if(options.headers['x-raizes-management']!==posted.managementToken)return Response.json({error:'Código inválido'},{status:403});
    return Response.json({business:{...posted.business,id:posted.businessId,shared:true}});
  };
  await assert.rejects(otherBrowser.restoreAccess(`raizes1.${posted.businessId}.${'0'.repeat(64)}`),/Código inválido/);
  assert.equal(otherBrowser.ownedBusinessIds().length,0);
  await otherBrowser.restoreAccess(code);
  assert.ok(otherBrowser.ownedBusinessIds().includes(posted.businessId));
  assert.equal(otherBrowser.canDeleteBusiness(otherBrowser.account.businesses[0]),true);
});

test('publicação no site principal aguarda a conexão e não cai silenciosamente no cadastro local',async t=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'location'),originalFetch=globalThis.fetch;
  Object.defineProperty(globalThis,'location',{configurable:true,value:{hostname:'raizes-empreendedoras.pages.dev'}});
  let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Não deve enviar');};
  t.after(()=>{if(descriptor)Object.defineProperty(globalThis,'location',descriptor);else delete globalThis.location;globalThis.fetch=originalFetch;});
  const api=await import('./api.js?test-connection-gate');
  await assert.rejects(api.publishBusiness({name:'Teste'},[]),/Aguarde/);
  api.account.loading=false;api.account.shared=false;
  await assert.rejects(api.publishBusiness({name:'Teste'},[]),/vitrine pública está indisponível/);
  assert.equal(calls,0);
});

