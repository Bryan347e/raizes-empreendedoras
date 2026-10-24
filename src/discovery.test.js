import { DEMO_BUSINESSES } from "../tests/fixtures/businesses.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PREFERENCES as defaults, parsePrice, approximateLocation, distanceKm, getPreferences, savePreferences, recommendProducts, rankBusinesses } from './discovery.js';


test('orçamento aceita centavos, zero e preços sob consulta, rejeita valores inválidos', () => {
  assert.equal(parsePrice('12,50'), 12.5);
  assert.equal(parsePrice('0'), 0);
  assert.equal(parsePrice(''), null);
  assert.ok(Number.isNaN(parsePrice('-1')));
  assert.ok(Number.isNaN(parsePrice('1.500,00')));
  assert.equal(savePreferences({ ...defaults, minPrice: '30', maxPrice: '10' }, null).ok, false);
});

test('recomenda produtos da categoria dentro do orçamento e prioriza gostos', () => {
  const results = recommendProducts(DEMO_BUSINESSES, { ...defaults, categories: ['Alimentação'], tastes: 'chocolate', maxPrice: '10' });
  assert.ok(results.length > 0);
  assert.ok(results.every(r => r.business.category === 'Alimentação' && r.product.price <= 10));
  assert.ok(results[0].matchesTaste);
  assert.equal(recommendProducts(DEMO_BUSINESSES, { ...defaults, maxPrice: '1' }).length, 0);
  assert.equal(recommendProducts([{ name:'Sem preço', category:'Serviços', offerings:['Conserto'] }], { ...defaults, maxPrice:'100' }).length, 0);
});

test('proximidade usa coordenadas arredondadas ou bairro e trata ausência de local', () => {
  const near = { name: 'Perto', neighborhood:'Santana', city:'São Paulo', location:{ latitude:-23.5, longitude:-46.63 }, offerings:['Produto'] };
  const far = { ...near, name:'Longe', neighborhood:'Pinheiros', location:{ latitude:-23.57, longitude:-46.69 } };
  assert.equal(rankBusinesses([far, near], { ...defaults, location:near.location })[0].name, 'Perto');
  assert.equal(rankBusinesses([far, near], { ...defaults, neighborhood:'Santana' })[0].name, 'Perto');
  assert.equal(distanceKm(near.location, near.location), 0);
  assert.equal(distanceKm(null, near.location), null);
  assert.equal(approximateLocation({ latitude:200, longitude:0 }), null);
  assert.deepEqual(approximateLocation({ latitude:-23.5012345, longitude:-46.6323456 }), near.location);
});

test('preferências persistem sem coordenadas precisas e suportam armazenamento bloqueado', () => {
  let saved;
  const storage = { getItem:()=>saved, setItem:(_, value)=>{saved=value;} };
  assert.equal(savePreferences({ ...defaults, tastes:'artesanal', location:{latitude:-23.501234,longitude:-46.632345} }, storage).ok, true);
  assert.equal(getPreferences(storage).tastes,'artesanal');
  assert.ok(!saved.includes('-23.501234'));
  assert.equal(savePreferences(defaults, null).ok, false);
  assert.deepEqual(getPreferences({getItem:()=>'{broken'}), defaults);
});

