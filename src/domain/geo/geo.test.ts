import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bearing, destination, fromLocal, haversineDistance, toLocal } from './geo';

const uninorte = { latitude: 11.0192, longitude: -74.8505 };

describe('haversineDistance', () => {
  it('mide un grado de latitud como ~111 km', () => {
    const d = haversineDistance({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    assert.ok(Math.abs(d - 111_195) < 10, `obtuvo ${d}`);
  });

  it('da cero para el mismo punto', () => {
    assert.equal(haversineDistance(uninorte, uninorte), 0);
  });
});

describe('destination y bearing', () => {
  it('llegan al punto esperado y recuperan el rumbo', () => {
    const p = destination(uninorte, 90, 500);
    assert.ok(Math.abs(haversineDistance(uninorte, p) - 500) < 0.01);
    assert.ok(Math.abs(bearing(uninorte, p) - 90) < 0.01);
  });
});

describe('toLocal / fromLocal', () => {
  it('son inversas y conservan distancias cortas', () => {
    const p = fromLocal(uninorte, { x: 300, y: -400 });
    const local = toLocal(uninorte, p);
    assert.ok(Math.abs(local.x - 300) < 1e-6);
    assert.ok(Math.abs(local.y + 400) < 1e-6);
    assert.ok(Math.abs(haversineDistance(uninorte, p) - 500) < 0.5);
  });
});
