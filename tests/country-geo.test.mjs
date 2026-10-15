import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countryCode, flagEmoji, COUNTRIES } from '../lib/country-geo.ts';

test('reconhece código, nome em português e em inglês', () => {
  assert.equal(countryCode('BR'), 'BR');
  assert.equal(countryCode('Brasil'), 'BR');
  assert.equal(countryCode('brazil'), 'BR');
  assert.equal(countryCode('México'), 'MX');
  assert.equal(countryCode('United States'), 'US');
  assert.equal(countryCode('Sem país'), null);
  assert.equal(countryCode(''), null);
});

test('bandeira e coordenadas válidas', () => {
  assert.equal(flagEmoji('BR'), '🇧🇷');
  assert.equal(flagEmoji('x'), '🌐');
  for (const [code, c] of Object.entries(COUNTRIES)) {
    assert.ok(Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180, code);
  }
});
