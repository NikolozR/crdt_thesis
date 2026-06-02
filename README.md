# CRDT Simulation — Project Overview

This is a Bachelor Thesis project that builds a full-stack interactive simulation engine for
**Conflict-free Replicated Data Types (CRDTs)**. The goal is to demonstrate, compare, and
analyse how different CRDT designs behave under network partition and eventual convergence —
using a controlled, deterministic, single-process environment instead of real distributed
infrastructure.

---

## Repository structure

```
crdt_simulation/
  backend/    NestJS simulation engine (TypeScript)
  frontend/   Next.js interactive UI (TypeScript + Tailwind)
  README.md   ← this file
```

---

## What the project does

Instead of running three real servers, the system creates three **virtual nodes**
(`Node-A`, `Node-B`, `Node-C`) inside one process and simulates a distributed network
over an in-memory event bus. You can:

- **Partition** the network (messages are queued, nodes diverge)
- **Reconnect** the network (queued messages flush in FIFO order, nodes converge)
- **Send operations** to any individual node while partitioned or healthy
- **Compare** how different CRDT implementations handle the same operation stream

The frontend makes this interactive: you pick which CRDTs to run side-by-side, operate
on nodes, toggle partitions, and watch state diverge and converge in real time.

---

## Backend — `backend/`

**Stack:** NestJS, TypeScript, EventEmitter2, Swagger

**Key source files:**

```
src/
  app.controller.ts               REST endpoints
  crdt/
    crdt.interface.ts             ICRDT<TLocalOp, TSyncPayload, TStateView> contract
    crdt.factory.ts               Factory: string id → concrete CRDT instance
    or-set.crdt.ts                OR-Set (add-wins)
    2p-set.crdt.ts                Two-Phase Set (remove-wins, permanent tombstone)
    lww-register.crdt.ts          Last-Writer-Wins Register (logical clock + actorId tie-break)
    mv-register.crdt.ts           Multi-Value Register (keeps all concurrent writes)
  node/
    node.service.ts               Virtual replica — holds N engines, routes operations
    node.factory.ts               Constructs NodeService instances
  network/
    network-simulator.service.ts  In-memory router — partition / reconnect / message delivery
  simulation/
    simulation.service.ts         Orchestrates init, operate, state retrieval
    simulation.types.ts           Shared types (CrdtType, NodeId, NodeOperation, …)
  simulation-runner/
    harness.ts                    Lightweight in-process test harness (no HTTP, no DI container)
    scenario.types.ts             ScenarioFn, ScenarioResult, ScenarioSnapshot types
    runner.ts                     Entry point: runs all scenarios, writes timestamped JSON
    scenarios/
      set/
        s01-add-wins-vs-remove-wins.ts
        s02-concurrent-adds-same-element.ts
        s03-remove-never-added.ts
        s04-add-remove-readd-during-partition.ts
        s05-three-way-concurrent.ts
        s06-sequential-no-partition.ts
        s07-concurrent-removes.ts
        s08-multiple-elements-mixed-ops.ts
      register/
        r01-concurrent-set.ts
        r02-sequential-no-partition.ts
        r03-triple-concurrent.ts
        r04-set-before-and-after-partition.ts
        r05-same-value-concurrent.ts
        r06-repeated-partition-cycles.ts
```

**REST API:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/simulation/init` | Create 3 nodes with chosen CRDT engines |
| POST | `/network/partition` | Enable partition — messages queued |
| POST | `/network/reconnect` | Disable partition — flush queued messages |
| POST | `/node/:id/operate` | Execute local operation on one node |
| GET | `/simulation/state` | Snapshot of all nodes' per-engine state |

Swagger UI: `http://localhost:3000/swagger`

**Scripts:**
```bash
npm run start:dev   # dev server on :3000
npm run simulate    # run all 14 scenarios headlessly, write results to simulation-results/
```

---

## The four CRDTs

All four implement the same `ICRDT<TLocalOperation, TSyncPayload, TStateView>` interface
with three methods: `applyLocalOperation`, `merge`, `getStateView`.

### Set family — operations: `add(value)` / `remove(value)`

**OR-Set (or-set) — add-wins**
Each `add` generates a globally unique tag (actorId + timestamp + random). The element
exists if at least one of its tags is not tombstoned. A `remove` only tombstones tags it
has *observed at remove-time* — so a concurrent unseen add tag can never be tombstoned by
that remove. Add always wins against a concurrent remove.

**2P-Set (2p-set) — remove-wins, permanent tombstone**
Maintains an `added` set and a `removed` (tombstone) set. Once a value enters `removed`
it can never re-enter `added`. Remove wins against any concurrent or future add of the
same value — including after a partition heals.

**Key contrast:** Same `add`/`remove` operation stream. Under partition with a concurrent
add on A and remove on B: OR-Set final state contains the element; 2P-Set does not.
After removal in 2P-Set, the element can never be re-added; in OR-Set a new `add` creates
a fresh tag and the element can return.

### Register family — operation: `set(value)`

**LWW-Register (lww-register) — last-writer-wins**
Each write carries a logical (Lamport) timestamp. Merge picks the higher timestamp.
Equal timestamps are broken deterministically by `actorId` string comparison. Concurrent
writes always collapse to one value — information is silently lost.

**MV-Register (mv-register) — multi-value, conflict-preserving**
Each write carries a Lamport timestamp. On merge, the register retains *all values written
at the maximum observed lamport layer*. Concurrent partitioned writes often share the same
timestamp, so all are kept as an array. A later causally-ordered write (strictly higher
lamport) replaces them. The register exposes conflicts to the application rather than
silently resolving them.

**Key contrast:** Under partition with A writing X and B writing Y at the same logical
time: LWW returns one value (winner by actorId); MV returns `["X","Y"]`. After any
replica writes again post-reconnect at a higher lamport, MV collapses back to a single
value.

---

## Simulation runner — 14 automated scenarios

Executed via `npm run simulate` from `backend/`. Each scenario builds a fresh harness
(direct class instantiation — no HTTP), runs a sequence of operations and partition
events, captures state snapshots at meaningful points, and writes the full result set
to `simulation-results/results-<timestamp>.json`.

**Set scenarios:**

| ID | Scenario | What it shows |
|----|----------|---------------|
| s01 | Classic partition: add on A, remove on B | Core add-wins vs remove-wins divergence |
| s02 | Concurrent adds of the same element | Both CRDTs agree — no conflict |
| s03 | Phantom remove (remove never-added element) | OR-Set: no-op; 2P-Set: permanent block on future adds |
| s04 | Add → remove vs re-add during partition | OR-Set: new tag survives; 2P-Set: tombstone is forever |
| s05 | Three-way: two adds vs one remove | OR-Set: 2 live tags survive; 2P-Set: one remove beats all adds |
| s06 | Sequential no partition: add → remove → re-add | Both agree after remove; OR-Set allows re-add, 2P-Set blocks it |
| s07 | Concurrent removes by two nodes | Both agree: element gone (idempotent removes) |
| s08 | Multiple elements, mixed ops | Conflict resolution is per-element; only contested element diverges |

**Register scenarios:**

| ID | Scenario | What it shows |
|----|----------|---------------|
| r01 | Concurrent set: A=X, B=Y | LWW picks one winner; MV retains both |
| r02 | Sequential no partition | Both converge — no conflict when causal order is clear |
| r03 | Triple concurrent: A=X, B=Y, C=Z | LWW discards 2 values; MV retains all 3 |
| r04 | Shared baseline → concurrent divergence → causal resolution | MV conflict collapses once a strictly later write arrives |
| r05 | Both nodes write same value concurrently | MV deduplicates — single value, no spurious conflict |
| r06 | Multiple partition/reconnect cycles | Clocks advance across cycles; later writes dominate earlier ones |

---

## Frontend — `frontend/`

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS

**Runs on:** `http://localhost:3001`

**Structure:**
```
app/
  page.tsx          Single-page UI — all state lives here
  layout.tsx        Root layout + metadata
components/
  SetupBar.tsx      CRDT family selector, Init button, Partition/Reconnect controls
  NodePanel.tsx     Per-node card: state per engine, divergence badge, operate form
  ActivityLog.tsx   Scrollable timestamped log of every action
lib/
  api.ts            Typed fetch wrapper for all 5 backend endpoints
  types.ts          Shared TypeScript types (mirrors backend shapes)
```

**UI layout:**
- **Header bar** — title, active CRDT list, loading indicator
- **Setup bar** — two Init buttons (set family / register family), network status badge (HEALTHY/PARTITIONED with queued message count), Partition / Reconnect button
- **Three node panels** (main area) — side by side, each showing per-engine state with a `diverged` amber badge when nodes disagree, plus an input + operation buttons
- **Activity log sidebar** — every action colour-coded by type (init / partition / reconnect / operate / error)

**To run:**
```bash
cd frontend
npm run dev   # http://localhost:3001
```

---

## How to run the full system

```bash
# Terminal 1 — backend
cd backend
npm run start:dev

# Terminal 2 — frontend
cd frontend
npm run dev

# Terminal 3 — headless scenario runner (optional)
cd backend
npm run simulate
```

---

## Current state and what is NOT done yet

### Done
- All four CRDT implementations fully working with correct merge semantics
- REST API with Swagger documentation
- In-process simulation harness (no HTTP overhead for automated runs)
- 14 automated scenarios covering edge cases across both CRDT families
- Results written to timestamped JSON files
- Interactive frontend: init, partition, operate, reconnect, live state display, activity log
- Divergence detection (amber badge when nodes disagree on a value)
- CORS configured (frontend → backend)

### Backlog / not yet done
1. **Custom CRDT** — a fifth CRDT implementation (leading candidate: LWW-Set, a
   timestamp-arbitrated set that is neither always add-wins nor permanently remove-wins)
   that would cover at least one scenario where all four current CRDTs produce the same
   outcome but the custom one differs.

2. **Better result display** — the simulation runner currently outputs raw JSON.
   A dedicated results viewer page (or inline in the frontend) that renders each scenario
   as a semantic card: description, per-CRDT outcome at each snapshot, highlighted
   conclusion.

3. **Custom scenario builder in the UI** — the frontend currently only supports
   ad-hoc manual operation. A scenario builder would let the user define a named
   sequence of steps (operate / partition / reconnect), save it, and replay it — mirroring
   what the backend runner does but driven from the UI.

4. **State persistence** — refreshing the frontend loses the session. Could be solved
   with polling `GET /simulation/state` on mount or storing the log in localStorage.

5. **Visual diff on reconnect** — highlight which values changed when the network heals,
   rather than requiring the user to compare before/after manually.

---

## Academic context

This project is a Bachelor Thesis. The simulation is intentionally single-process and
deterministic so experiments are reproducible. The thesis compares:

- **Add-wins vs remove-wins** conflict resolution policies (OR-Set vs 2P-Set)
- **Silent winner selection vs explicit conflict exposure** (LWW vs MV-Register)

The architecture deliberately separates network behaviour (partition/reconnect) from CRDT
merge behaviour so the only variable in any experiment is the choice of data structure.
