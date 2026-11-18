import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fromLocal, type LatLon } from '../geo/geo';
import type { LocationProvider, ProviderEvent } from '../repositories/LocationProvider';
import type { TrackingServer } from '../repositories/TrackingServer';
import { TrackingSession } from '../usecases/TrackingSession';
import type { Fix, Geofence } from './entities';
import { FixFilter } from './fixFilter';
import { updateZones } from './geofence';
import { summarizeTrack } from './trackStats';
import { UploadQueue } from './uploadQueue';

const origin: LatLon = { latitude: 11.0192, longitude: -74.8505 };
const T0 = 1_700_000_000_000;

/** Punto a x metros al este y y al norte del origen, en el segundo t. */
function fix(x: number, y: number, t: number, accuracyM = 5): Fix {
  return {
    ...fromLocal(origin, { x, y }),
    accuracyM,
    speedMps: null,
    headingDeg: null,
    timestamp: T0 + t * 1000,
    satellitesUsed: 8,
    environment: 'open',
  };
}

describe('FixFilter', () => {
  it('descarta puntos con mala precisión', () => {
    const f = new FixFilter();
    const d = f.evaluate(fix(0, 0, 0, 80));
    assert.equal(d.accepted, false);
    assert.equal(!d.accepted && d.reason, 'accuracy');
  });

  it('descarta saltos imposibles y luego sigue aceptando el recorrido real', () => {
    const f = new FixFilter();
    assert.equal(f.evaluate(fix(0, 0, 0)).accepted, true);
    const jump = f.evaluate(fix(300, 0, 1));
    assert.equal(!jump.accepted && jump.reason, 'jump');
    assert.equal(f.evaluate(fix(20, 0, 2)).accepted, true);
  });

  it('ignora puntos sin movimiento', () => {
    const f = new FixFilter();
    f.evaluate(fix(0, 0, 0));
    const d = f.evaluate(fix(1, 0, 1));
    assert.equal(!d.accepted && d.reason, 'stationary');
  });

  it('si el salto se repite varias veces, acepta la nueva posición', () => {
    const f = new FixFilter();
    f.evaluate(fix(0, 0, 0));
    for (let t = 1; t <= 3; t++) assert.equal(f.evaluate(fix(1000, 0, t)).accepted, false);
    assert.equal(f.evaluate(fix(1000, 0, 4)).accepted, true);
  });
});

describe('updateZones', () => {
  const zone: Geofence = { id: 'z', name: 'Zona', center: origin, radiusM: 50 };

  it('avisa al entrar y al salir, con margen en el borde', () => {
    let inside = new Set<string>();
    let r = updateZones(inside, [zone], fromLocal(origin, { x: 80, y: 0 }), 0);
    assert.equal(r.events.length, 0);

    r = updateZones(r.inside, [zone], fromLocal(origin, { x: 40, y: 0 }), 1);
    assert.deepEqual(r.events.map((e) => e.type), ['enter']);
    inside = r.inside;

    r = updateZones(inside, [zone], fromLocal(origin, { x: 53, y: 0 }), 2);
    assert.equal(r.events.length, 0, 'dentro del margen no sale');

    r = updateZones(r.inside, [zone], fromLocal(origin, { x: 70, y: 0 }), 3);
    assert.deepEqual(r.events.map((e) => e.type), ['exit']);
  });
});

describe('UploadQueue', () => {
  it('envía por lotes y retiene todo mientras no hay conexión', () => {
    const q = new UploadQueue(3, 10_000);
    q.add(fix(0, 0, 0));
    q.add(fix(10, 0, 1));
    assert.equal(q.takeBatch(true, T0 + 1000), null, 'aún no completa el lote');
    q.add(fix(20, 0, 2));
    q.add(fix(30, 0, 3));
    assert.equal(q.takeBatch(false, T0 + 3000), null, 'sin conexión no envía');
    assert.equal(q.takeBatch(true, T0 + 3000)?.length, 3);
    assert.equal(q.size, 1);
  });

  it('envía un lote incompleto si el punto más viejo esperó demasiado', () => {
    const q = new UploadQueue(5, 10_000);
    q.add(fix(0, 0, 0));
    assert.equal(q.takeBatch(true, T0 + 10_000)?.length, 1);
  });
});

describe('summarizeTrack', () => {
  it('suma distancia y calcula velocidades', () => {
    const s = summarizeTrack([fix(0, 0, 0), fix(100, 0, 10), fix(100, 100, 20)]);
    assert.ok(Math.abs(s.distanceM - 200) < 0.5);
    assert.equal(s.durationS, 20);
    assert.ok(Math.abs(s.avgSpeedKmh - 36) < 0.1);
  });
});

describe('TrackingSession', () => {
  class FakeProvider implements LocationProvider {
    readonly source = 'simulated' as const;
    emit: (e: ProviderEvent) => void = () => {};
    async start(onEvent: (e: ProviderEvent) => void) {
      this.emit = onEvent;
      return () => {};
    }
  }

  class FakeServer implements TrackingServer {
    received: Fix[] = [];
    async upload(_id: string, batch: readonly Fix[]) {
      this.received.push(...batch);
    }
  }

  const flushPromises = () => new Promise((r) => setTimeout(r, 0));

  it('filtra, detecta geocercas, guarda sin conexión y reenvía al reconectar', async () => {
    const provider = new FakeProvider();
    const server = new FakeServer();
    const zone: Geofence = { id: 'z', name: 'Campus', center: fromLocal(origin, { x: 100, y: 0 }), radiusM: 30 };
    const session = new TrackingSession(provider, server, {
      deviceId: 'test',
      geofences: [zone],
      queue: new UploadQueue(2, 60_000),
    });
    await session.start();

    session.setOnline(false);
    provider.emit({ type: 'fix', fix: fix(0, 0, 0) });
    provider.emit({ type: 'fix', fix: fix(50, 0, 5) });
    provider.emit({ type: 'fix', fix: fix(900, 0, 6) }); // salto
    provider.emit({ type: 'no-fix', reason: 'túnel' });
    provider.emit({ type: 'fix', fix: fix(100, 0, 10) }); // entra al campus
    await flushPromises();

    let s = session.getSnapshot();
    assert.equal(s.track.length, 3);
    assert.equal(s.rejected.length, 1);
    assert.deepEqual(s.insideZones, ['z']);
    assert.equal(s.pending, 3);
    assert.equal(server.received.length, 0);
    assert.ok(s.log.some((l) => l.text.includes('Entró a Campus')));
    assert.ok(s.log.some((l) => l.kind === 'signal'));

    session.setOnline(true);
    await flushPromises();
    s = session.getSnapshot();
    assert.equal(server.received.length, 3);
    assert.equal(s.pending, 0);
    assert.equal(s.sent, 3);
  });
});
