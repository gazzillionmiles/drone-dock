# Drone Dock

Real-time telemetry backend + dashboard for a fleet of 10 simulated drones.
Node.js/Express/`ws` on the backend, React (Vite) on the frontend.

```
drone-dock/
  backend/    REST API + WebSocket server + telemetry simulator
  frontend/   React dashboard
```

## Quick start

Two terminals:

```bash
# 1. Backend — http://localhost:3000, ws://localhost:3000/ws
cd backend
npm install
npm start

# 2. Frontend — http://localhost:5173 (proxies /api to :3000 in dev)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Telemetry starts streaming immediately; no
extra setup required.

For production, `npm run build` in `frontend/` and serve the `dist/`
folder from any static host (or from Express — not wired up here to keep
the dev workflow simple, noted as an assumption below).

---

## Architecture

**Backend** (`backend/src`)

```
config/       env-driven configuration
models/       Drone data shape
simulator/    owns fleet state, advances it on a 1s tick, emits 'update'
services/     validation + business rules, decoupled from HTTP/WS
controllers/  Express request handlers
routes/       route wiring
websocket/    ws server: sync on connect, delta broadcast, subscriptions,
              heartbeat
middleware/   centralized error handling (malformed JSON, 404, 500)
utils/        delta diffing, logging
app.js        Express app assembly (testable without a listening socket)
server.js     process entrypoint, graceful shutdown
```

The simulator is an `EventEmitter` and is the single source of truth for
drone state. Both the REST layer and the WebSocket layer read from it —
REST via `droneService`, WebSocket by subscribing to its `update` event.
This means a REST `GET` and a WS `sync` can never disagree.

**Frontend** (`frontend/src`)

```
components/   presentational pieces (DroneCard, DroneGrid, ConnectionStatus, FleetSummary)
pages/        Dashboard (the one screen this app has)
hooks/        useWebSocket — connection lifecycle, reconnect, delta merge
context/      DroneContext — app-wide fleet state + actions
services/     REST client (api.js)
utils/        formatting helpers
```

`useWebSocket` is the only place that touches `WebSocket` directly. It
merges `sync` (full snapshot) and `telemetry` (delta) messages into one
`drones` map and exposes plain `status`/`pulse` state, so components stay
free of networking logic.

---

## Real-time design

- **Sync on connect/reconnect** — every new connection immediately
  receives `{ type: 'sync', payload: [...all drones] }`. This is what
  makes reconnection safe: the client never has to reason about which
  deltas it might have missed while offline, it just replaces its state
  wholesale and resumes applying deltas from there (Part 5).
- **Delta-only updates (Bonus 1)** — `utils/delta.js` diffs each tick's
  drone against the last broadcast snapshot and sends only the fields
  that changed, keyed by `id`. If nothing but `updatedAt` changed
  (nothing meaningful moved), no event is sent at all — this also
  satisfies "no duplicate events" from Part 3.
- **Subscriptions (Bonus 2)** — a client can send
  `{ type: 'subscribe', droneIds: [2,5,7] }` to narrow the stream. Until
  it does, it receives all drones by default, since that's what the
  dashboard needs; `{ type: 'unsubscribe' }` reverts to "all".
- **Heartbeat (Bonus 3)** — the server pings every 15s
  (`HEARTBEAT_INTERVAL_MS`) and terminates a connection that hasn't
  answered (either a WS-level pong or a `{type:'pong'}` message) within
  40s (`HEARTBEAT_TIMEOUT_MS`). The frontend's connection indicator is
  driven by these real ping frames, not a decorative animation.
- **Commands (Bonus 4)** — `POST /api/drones/:id/command` accepts
  `TAKEOFF | LAND | RETURN_HOME | PAUSE_MISSION`, updates the simulator's
  authoritative state, and the resulting change flows to all clients
  through the normal delta path — there's no separate "command ack"
  channel to keep in sync.
- **Mission progress (Bonus 5)** — drones accumulate `missionProgress`
  while `FLYING`/`RETURNING`; at 100 the status becomes `COMPLETED` and
  the drone freezes (no further battery drain or movement), which the UI
  reflects by disabling its command buttons.

## Error handling (Part 7)

| Case | Behavior |
| --- | --- |
| Invalid drone ID | `400 INVALID_ID` on REST; ignored (no crash) on WS |
| Unknown drone ID | `404 NOT_FOUND` |
| Malformed JSON (HTTP body) | `express.json()` throws → middleware returns `400 MALFORMED_JSON` |
| Malformed JSON (WS message) | caught per-message, connection stays open, client gets `{type:'error'}` |
| WebSocket disconnect | connection removed from the client map; frontend shows "Disconnected…" and reconnects with exponential backoff (1s → 10s cap) |
| Server restart | `SIGINT`/`SIGTERM` stop the simulator and close the HTTP server cleanly; `uncaughtException`/`unhandledRejection` are logged instead of crashing the process |
| Empty PATCH body | `400 INVALID_NAME` |

## Performance at scale — 1000 drones / 100 dashboards (Part 6)

Not implemented, per the brief, but here's what I'd change and why:

1. **Delta updates are already in place**, but at 1000 drones × 1 tick/s
   that's still up to 1000 tiny messages/second fanned out to 100
   sockets = 100k sends/second from a single event-loop thread. That's
   the first bottleneck.
2. **Event batching** — coalesce a tick's deltas into one message
   (`{type:'batch', payload:[...]}`) sent once per tick per client
   instead of one message per drone. Cuts message count ~1000x with
   negligible latency cost for a 1s tick.
3. **Compression** — enable `permessage-deflate` on the `ws` server (or
   move to a binary format like MessagePack/protobuf) once batched
   payloads get large; JSON overhead adds up at this volume.
4. **Horizontal scaling** — a single Node process is fine for 10
   drones/handful of clients but not for 100 concurrent sockets each
   needing a fanout of 1000 drones' worth of state. Run multiple
   instances behind a load balancer with **sticky sessions** for the WS
   upgrade, and move the simulator itself out of the request path.
5. **Message broker** — once there's more than one server instance, the
   simulator (or a real telemetry ingestion service) should publish to
   Redis Pub/Sub, NATS, or Kafka instead of an in-process
   `EventEmitter`, so every instance's WS layer subscribes to the same
   stream regardless of which instance a given drone's data originated
   on.
6. **Load balancing** — an L4/L7 balancer (e.g. Nginx, or a cloud LB) in
   front of the Node instances, health-checked against `/health`, with
   WS upgrade support and sticky routing so a client's reconnect logic
   doesn't need to be broker-aware.
7. Subscriptions become more important at this scale — a dashboard
   showing 20 drones shouldn't receive telemetry for the other 980;
   enforcing that server-side (rather than trusting the client to
   filter) is what actually saves the bandwidth.

## Assumptions

- No auth/persistence layer — telemetry lives in memory, as implied by
  "simulator." A real deployment would swap `simulator/` for a real
  ingestion source without touching the REST/WS/React layers, since the
  service layer already isolates them.
- Default WS subscription is "all drones" (rather than "none") since
  that's what a dashboard showing every drone needs out of the box;
  `subscribe`/`unsubscribe` narrow/reset it.
- `missionProgress` only advances during `FLYING`/`RETURNING`, since
  that's when a drone is plausibly "making progress" toward a mission
  vs. idling or landing.
- Dev CORS is wide open (`origin: '*'`) for convenience; would be
  locked down per-environment in production.
- Frontend and backend are two separate dev servers (Vite proxy handles
  `/api` in dev). In production I'd serve the built frontend as static
  files from the Express app, or from a CDN/static host pointed at the
  same origin as the API — not wired up here to keep `npm run dev`
  simple for review.
