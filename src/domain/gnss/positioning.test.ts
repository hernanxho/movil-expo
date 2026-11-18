import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { haversineDistance } from '../geo/geo';
import { skyAt, visibleIn } from './constellation';
import { azimuthElevation, ecefToGeodetic, geodeticToEcef } from './coordinates';
import { norm } from './linalg';
import {
  dilutionOfPrecision,
  InsufficientSatellitesError,
  pseudorange,
  SPEED_OF_LIGHT,
  solvePosition,
} from './positioning';
import { createRng } from './random';
import { receiverEpoch } from './receiver';

const uninorte = { latitude: 11.0192, longitude: -74.8505 };

describe('coordenadas', () => {
  it('ECEF ida y vuelta conserva la posición', () => {
    const back = ecefToGeodetic(geodeticToEcef(uninorte, 25));
    assert.ok(Math.abs(back.latitude - uninorte.latitude) < 1e-9);
    assert.ok(Math.abs(back.longitude - uninorte.longitude) < 1e-9);
    assert.ok(Math.abs(back.heightM - 25) < 1e-3);
  });
});

describe('constelación', () => {
  it('ubica los satélites a ~20 200 km de altura con el azimut y la elevación pedidos', () => {
    const r = geodeticToEcef(uninorte);
    for (const s of skyAt(uninorte, 0)) {
      assert.ok(Math.abs(norm(s.position) - 26_560_000) < 1);
      const seen = azimuthElevation(uninorte, r, s.position);
      assert.ok(Math.abs(seen.elevationDeg - s.elevationDeg) < 1e-6);
      assert.ok(Math.abs(seen.azimuthDeg - s.azimuthDeg) < 1e-6);
    }
  });
});

describe('solvePosition', () => {
  it('recupera la posición exacta y el error del reloj cuando no hay ruido', () => {
    const r = geodeticToEcef(uninorte);
    const clockBiasS = 0.000_42;
    const sats = visibleIn('open', skyAt(uninorte, 0));
    const solution = solvePosition(
      sats.map((s) => ({ prn: s.prn, satellite: s.position, pseudorange: pseudorange(r, s.position, clockBiasS) })),
    );
    assert.ok(haversineDistance(uninorte, ecefToGeodetic(solution.ecef)) < 0.01);
    assert.ok(Math.abs(solution.clockBiasM - clockBiasS * SPEED_OF_LIGHT) < 0.01);
  });

  it('exige al menos cuatro satélites', () => {
    const r = geodeticToEcef(uninorte);
    const sats = skyAt(uninorte, 0).slice(0, 3);
    assert.throws(
      () =>
        solvePosition(
          sats.map((s) => ({ prn: s.prn, satellite: s.position, pseudorange: pseudorange(r, s.position, 0) })),
        ),
      InsufficientSatellitesError,
    );
  });
});

describe('dilución de la precisión', () => {
  it('empeora cuando solo quedan satélites altos (cañón urbano)', () => {
    const sky = skyAt(uninorte, 0);
    const open = dilutionOfPrecision(visibleIn('open', sky));
    const urban = dilutionOfPrecision(visibleIn('urban', sky));
    assert.ok(open && urban);
    assert.ok(urban.hdop > open.hdop);
  });
});

describe('receiverEpoch', () => {
  it('a cielo abierto el error queda en pocos metros', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const epoch = receiverEpoch({
        truth: uninorte,
        tSeconds: seed * 10,
        environment: 'open',
        rng: createRng(seed),
        clockBiasS: 0.0003,
      });
      assert.ok(epoch.errorM !== null && epoch.errorM < 20, `semilla ${seed}: error ${epoch.errorM}`);
    }
  });

  it('en un túnel no hay solución', () => {
    const epoch = receiverEpoch({
      truth: uninorte,
      tSeconds: 0,
      environment: 'tunnel',
      rng: createRng(7),
      clockBiasS: 0,
    });
    assert.equal(epoch.position, null);
    assert.match(epoch.failure ?? '', /al menos 4/);
  });
});
