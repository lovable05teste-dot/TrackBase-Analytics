import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBrNumber } from '../lib/br-number.ts';

test('entende o formato brasileiro e o com ponto', () => {
  assert.equal(parseBrNumber('1000,50'), 1000.5);
  assert.equal(parseBrNumber('1.234,56'), 1234.56);
  assert.equal(parseBrNumber('R$ 97'), 97);
  assert.equal(parseBrNumber('1234.56'), 1234.56);
  assert.equal(parseBrNumber(47), 47);
});

test('vazio e lixo viram 0 sem NaN', () => {
  assert.equal(parseBrNumber(''), 0);
  assert.equal(parseBrNumber('abc'), 0);
  assert.equal(parseBrNumber(null), 0);
  assert.equal(parseBrNumber(Infinity), 0);
});
