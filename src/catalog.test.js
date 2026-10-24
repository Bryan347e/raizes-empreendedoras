import { DEMO_BUSINESSES } from "../tests/fixtures/businesses.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  UNITS, getAllBusinesses, getCreatedBusinesses,
  getFavorites, toggleFavorite, filterBusinesses, validateBusiness,
  saveBusiness
} from "./catalog.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

test("as 44 unidades informadas estão disponíveis sem duplicatas", () => {
  assert.equal(UNITS.length, 44);
  assert.equal(new Set(UNITS).size, 44);
  assert.equal(UNITS[0], "ETEC Abdias do Nascimento — Paraisópolis");
  assert.equal(UNITS.at(-1), "ETEC da Zona Leste — Cidade A. E. Carvalho");
  assert.ok(DEMO_BUSINESSES.every((business) => UNITS.includes(business.unit)));
});

test("busca sem acentos combina com categoria e unidade", () => {
  const filtered = filterBusinesses(DEMO_BUSINESSES, {
    query: "ceramicas",
    category: "Casa e Construção",
    unit: "ETEC Prof. Basílides de Godoy — Vila Leopoldina"
  });
  assert.deepEqual(filtered.map((item) => item.id), ["casa-de-barro"]);
  assert.equal(filterBusinesses(DEMO_BUSINESSES, { query: "ceramicas", unit: "ETEC São Paulo — Bom Retiro" }).length, 0);
});

test("cadastro valida os campos essenciais e aparece na busca", () => {
  const storage = memoryStorage();
  const emptyErrors = validateBusiness({});
  assert.deepEqual(Object.keys(emptyErrors).sort(), ["category", "contact", "description", "name", "offerings", "student", "unit"]);
  const result = saveBusiness({
    name: "Ateliê Girassol",
    category: "Varejo",
    description: "Peças de papelaria artesanal para organizar os estudos com cor e criatividade.",
    offerings: "Cadernos\nMarcadores",
    student: "Ana Silva",
    unit: "ETEC São Paulo — Bom Retiro",
    contact: "ana@exemplo.com"
  }, [], storage);
  assert.equal(result.ok, true);
  assert.equal(getCreatedBusinesses(storage).length, 1);
  assert.deepEqual(filterBusinesses(getAllBusinesses(storage), { query: "girassol" }).map((item) => item.id), [result.business.id]);
  assert.deepEqual(result.business.offerings, ["Cadernos", "Marcadores"]);
});

test("favoritos são adicionados, removidos e lidos do armazenamento", () => {
  const storage = memoryStorage();
  assert.equal(toggleFavorite("raiz-brownie", storage), true);
  assert.deepEqual(getFavorites(storage), ["raiz-brownie"]);
  assert.equal(toggleFavorite("raiz-brownie", storage), false);
  assert.deepEqual(getFavorites(storage), []);
});

test("dados inválidos no armazenamento não quebram a vitrine", () => {
  const storage = memoryStorage();
  storage.setItem("raizes:businesses:v1", "{invalido");
  storage.setItem("raizes:favorites:v1", "{invalido");
  assert.equal(getAllBusinesses(storage).length, 0);
  assert.deepEqual(getFavorites(storage), []);
});

test("falha ao gravar informa o problema sem adicionar uma marca", () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
  const result = saveBusiness({
    name: "Ateliê Girassol",
    category: "Varejo",
    description: "Peças de papelaria artesanal para organizar os estudos com criatividade.",
    offerings: "Cadernos",
    student: "Ana Silva",
    unit: "ETEC São Paulo — Bom Retiro",
    contact: "ana@exemplo.com"
  }, [], storage);
  assert.equal(result.ok, false);
  assert.match(result.errors.form, /Não foi possível salvar/);
});

