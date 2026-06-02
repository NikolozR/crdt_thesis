# CRDT Simulation Backend (NestJS)

This project is a backend simulation engine for demonstrating **Conflict-free Replicated Data Types (CRDTs)** in a controlled, single-process environment.

Instead of running multiple real servers, the system creates **virtual nodes** (`Node-A`, `Node-B`, `Node-C`) inside one NestJS application and simulates replica communication over an **in-memory event bus**.

The goal is to make it easy to observe:

- divergence during network partition,
- deterministic message replay after reconnect,
- and eventual convergence properties of CRDTs.

---

## What this project simulates

### Mock Network model

- `NodeService` instances act as independent replicas with local state.
- Nodes emit sync messages through `@nestjs/event-emitter`.
- `NetworkSimulatorService` behaves as a virtual transport layer:
  - forwards messages immediately when network is healthy,
  - queues messages while partitioned,
  - flushes queued messages during reconnect.

This architecture isolates **network behavior** from **CRDT merge behavior**, which is useful for thesis experiments.

### Implemented CRDTs

Each virtual node can run **multiple engines in parallel** (see `POST /simulation/init` `compare` array). The same local operation and the same sync traffic are applied to every selected engine so you can contrast outcomes.

1. **Add-Wins OR-Set (`or-set`)**
   - Supports `add(value)` and `remove(value)`.
   - Each add gets a unique tag.
   - Remove only tombstones tags observed at remove-time.
   - Concurrent unseen add survives remove, so **add wins**.

2. **Two-Phase Set / remove-wins (`2p-set`)**
   - Supports the same `add` / `remove` operations as the OR-Set run.
   - Maintains a permanent tombstone set: after a remove, that element **cannot** be added back.
   - Contrasts with OR-Set when the same add/remove stream is replayed after a partition.

3. **LWW Register (`lww-register`)**
   - Supports `set(value)`.
   - Uses logical timestamps to choose winner.
   - Uses `actorId` as deterministic tie-breaker when timestamps are equal.

4. **Multi-Value Register (`mv-register`)**
   - Supports the same `set(value)` operation shape as LWW.
   - Under concurrent writes at the same logical layer, **keeps all values** (array) instead of picking a single winner.

---

## Project structure

Key files:

- `src/main.ts` - app bootstrap + Swagger setup
- `src/app.module.ts` - root Nest module
- `src/app.controller.ts` - REST endpoints for simulation control
- `src/network/network-simulator.service.ts` - partition/reconnect and message routing
- `src/node/node.service.ts` - virtual node/replica behavior
- `src/simulation/simulation.service.ts` - orchestrates init/operations/state
- `src/crdt/or-set.crdt.ts` - OR-Set implementation
- `src/crdt/2p-set.crdt.ts` - Two-Phase Set (remove-wins)
- `src/crdt/lww-register.crdt.ts` - LWW Register implementation
- `src/crdt/mv-register.crdt.ts` - Multi-Value Register implementation
- `src/crdt/crdt.factory.ts` - CRDT instantiation

---

## Prerequisites

- Node.js 18+ (Node.js 20 recommended)
- npm

---

## Install and run

```bash
npm install
npm run start:dev
```

Application default URL:

- API base: [http://localhost:3000](http://localhost:3000)
- Swagger UI: [http://localhost:3000/swagger](http://localhost:3000/swagger)

Production build:

```bash
npm run build
npm run start
```

---

## API endpoints

### `POST /simulation/init`

Initializes 3 virtual nodes. Pass a **`compare` array** listing which CRDT engines run **side-by-side** on every node. All entries must be from the same *family*: either set CRDTs (`or-set`, `2p-set`) or register CRDTs (`lww-register`, `mv-register`).

```json
{
  "compare": ["or-set", "2p-set"]
}
```

```json
{
  "compare": ["lww-register", "mv-register"]
}
```

### `POST /network/partition`

Enables partition mode. Sync messages are queued (not delivered).

### `POST /network/reconnect`

Disables partition mode and flushes queued messages.

### `POST /node/:id/operate`

Executes local operation on one node (`A`, `B`, `C`, `Node-A`, `Node-B`, `Node-C`).

Set-family examples (`compare` includes `or-set` and/or `2p-set`):

```json
{
  "operation": { "type": "add", "value": "Apple" }
}
```

```json
{
  "operation": { "type": "remove", "value": "Apple" }
}
```

Register-family example (`compare` includes `lww-register` and/or `mv-register`):

```json
{
  "operation": { "type": "set", "value": "Version-2" }
}
```

### `GET /simulation/state`

Returns:

- `compare`: active engine ids for this run,
- `network`: `isPartitioned`, queued message count,
- `nodes`: per-node object whose keys are engine ids (`or-set`, `2p-set`, `lww-register`, `mv-register`).

Example shape for set comparison on `Node-A`:

```json
"Node-A": {
  "or-set": ["Apple"],
  "2p-set": []
}
```

Register engines: `lww-register` is an object `{ value, timestamp, actorId }`; `mv-register` is a string array of concurrent values.

---

## Suggested demo scenarios

### Scenario A: OR-Set vs 2P-Set under partition

1. `POST /simulation/init` with `{ "compare": ["or-set", "2p-set"] }`
2. `POST /network/partition`
3. On `Node-A`: add `Apple`
4. On `Node-B`: remove `Apple` (without observing A's add)
5. `GET /simulation/state` (expect divergence)
6. `POST /network/reconnect`
7. `GET /simulation/state` — compare `or-set` vs `2p-set` element arrays (add-wins vs remove-wins).

### Scenario B: LWW vs MV register under partition

1. `POST /simulation/init` with `{ "compare": ["lww-register", "mv-register"] }`
2. `POST /network/partition`
3. On `Node-A`: set value `X`
4. On `Node-B`: set value `Y`
5. `POST /network/reconnect`
6. `GET /simulation/state` — `lww-register` shows one winner; `mv-register` may list multiple values until a strictly later write supersedes the concurrent layer.

---

## Why single-process simulation?

- Easier to run and debug than a multi-server setup.
- Deterministic and repeatable for thesis experiments.
- Lets you focus on **semantics** (merge logic, eventual consistency) instead of deployment overhead.

---

## Notes

- The project uses strict TypeScript settings.
- Message ordering in queued flush is FIFO for deterministic replay clarity in demos.
- This is an educational simulation; it models CRDT behavior and partition effects, not production transport guarantees.
