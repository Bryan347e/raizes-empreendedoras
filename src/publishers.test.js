import test from 'node:test';
import assert from 'node:assert/strict';
import {groupBusinessesByResponsible, UNITS, getCreatedBusinesses, saveBusiness} from './catalog.js';
import {ownedBusinessIds, account, publishBusiness, canDeleteBusiness, deleteBusiness, managementKeys} from './api.js';

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
    if(options.method==='POST') {receipt=JSON.parse(options.body); return Response.json({business},{status:201});}
    assert.equal(options.method,'DELETE'); assert.equal(url,`api/businesses/${business.id}`);
    assert.equal(options.headers['x-raizes-management'],receipt.managementToken);
    return Response.json({deleted:true});
  };
  account.shared=true; account.businesses=[];
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

