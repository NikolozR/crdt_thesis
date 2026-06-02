# Simulation Scenarios

All scenarios run on a three-node virtual network (Node-A, Node-B, Node-C) inside a
single NestJS process. "Partition" means messages are queued and not delivered.
"Reconnect" flushes the queue in FIFO order. Each scenario is isolated — fresh state
every run.

---

## Set family — OR-Set vs 2P-Set (vs PW-Set)

These CRDTs all accept `add(value)` and `remove(value)` operations but resolve
concurrent conflicts with completely different rules.

**OR-Set (add-wins):** every `add` generates a unique tag. A `remove` only tombstones
tags it has already observed. A concurrent add on another node produces a tag the remove
has never seen, so it cannot be tombstoned — add always wins.

**2P-Set (remove-wins, permanent tombstone):** maintains an `added` set and a `removed`
tombstone set. Once a value enters `removed` it can never re-enter `added`, regardless
of future operations or order of delivery.

**PW-Set (priority-wins):** each operation carries a numeric `weight`. The set tracks
the maximum weight seen for an add and the maximum weight seen for a remove, per value.
An element is present iff its max-add-weight is strictly greater than its
max-remove-weight. Neither add nor remove wins unconditionally — authority decides.

---

### S01 — Classic add-wins vs remove-wins

**Setup:** Partition → Node-A adds `"Apple"` → Node-B removes `"Apple"` → Reconnect.

Node-B removes `"Apple"` while isolated. Because it never received Node-A's add, its
remove payload carries an empty list of observed tags. When the network heals, the remove
message cannot tombstone Node-A's tag — it never knew about it.

**OR-Set result:** `["Apple"]` on all nodes — the unseen add tag survives.
**2P-Set result:** `[]` on all nodes — the remove tombstone propagates and wins.

This is the thesis core case: same operations, same network events, opposite outcomes
purely because of different merge logic.

---

### S02 — Concurrent adds of the same element

**Setup:** Partition → Node-A adds `"Apple"` → Node-B adds `"Apple"` → Reconnect.

No conflict here — both nodes want the element present.

**OR-Set result:** `["Apple"]` — two live tags, neither tombstoned.
**2P-Set result:** `["Apple"]` — both adds merge safely.

Both CRDTs agree. Confirms that concurrent non-conflicting operations converge correctly.

---

### S03 — Phantom remove (remove something never added)

**Setup:** Node-A removes `"Ghost"` (network healthy, `"Ghost"` was never added) →
Node-B tries to add `"Ghost"`.

**OR-Set result after phantom remove:** nothing changes — the remove payload carries zero
tags, so the tombstone set stays empty. Node-B's add succeeds and `"Ghost"` appears.

**2P-Set result after phantom remove:** `"Ghost"` is written to the permanent tombstone
set even though it was never in `added`. Node-B's subsequent add is permanently blocked.
`"Ghost"` never appears.

This exposes a critical asymmetry: a phantom remove is a no-op in OR-Set but permanently
poisons the tombstone set in 2P-Set.

---

### S04 — Add → remove vs re-add during partition

**Setup:** Node-A adds `"Apple"` (healthy, all nodes receive it) → Partition →
Node-B removes `"Apple"` → Node-A adds `"Apple"` again (fresh tag) → Reconnect.

Node-B's remove observes and tombstones the original tag. Simultaneously, Node-A generates
a brand-new tag for its re-add. Node-B's remove cannot tombstone what it has never seen.

**OR-Set result:** `["Apple"]` — the new tag survives.
**2P-Set result:** `[]` — the permanent tombstone blocks the re-add regardless of the new
tag.

---

### S05 — Three-way concurrent: two adds vs one remove

**Setup:** Partition → Node-A adds `"Apple"` → Node-B removes `"Apple"` → Node-C adds
`"Apple"` → Reconnect.

Node-B's remove is causally blind to both Node-A's and Node-C's adds (they were all
isolated). The remove payload carries zero observed tags.

**OR-Set result:** `["Apple"]` — two unseen add tags survive the blind remove.
**2P-Set result:** `[]` — one remove permanently wins over any number of concurrent adds.

---

### S06 — Sequential no-partition: add → remove → re-add

**Setup:** Node-A adds `"Apple"` → Node-A removes `"Apple"` → Node-A adds `"Apple"`
again (network healthy throughout).

All operations are causally ordered. The remove observes and tombstones the original tag.

**After add → remove:** both CRDTs agree — `"Apple"` is absent.
**After re-add:**
- OR-Set: new tag, element returns — `["Apple"]`.
- 2P-Set: permanent tombstone blocks re-insertion — `[]` forever.

---

### S07 — Concurrent removes by two nodes

**Setup:** Node-A adds `"Apple"` (healthy) → Partition → Node-A removes `"Apple"` →
Node-B removes `"Apple"` → Reconnect.

Both nodes observed the original add before the partition, so both remove payloads
contain the original tag. Duplicate tombstones are idempotent.

**OR-Set result:** `[]` — tag tombstoned, merge is idempotent.
**2P-Set result:** `[]` — same.

Both CRDTs agree when all concurrent operations are removes.

---

### S08 — Multiple elements, mixed operations

**Setup:** Partition → Node-A adds `"Apple"`, adds `"Banana"` → Node-B removes `"Apple"`,
adds `"Cherry"` → Reconnect.

Conflict only exists on `"Apple"`. `"Banana"` and `"Cherry"` are uncontested.

**OR-Set final set:** `["Apple", "Banana", "Cherry"]` — Apple survives (add-wins).
**2P-Set final set:** `["Banana", "Cherry"]` — Apple tombstoned (remove-wins).

Demonstrates that conflict resolution is per-element and independent.

---

### S09 — Moderated Workspace (PW-Set vs OR-Set and 2P-Set)

This scenario has two phases, each demonstrating where exactly a standard CRDT fails
and why PW-Set is the only design that handles both cases correctly.

**Phase 1 — The Troll:**
Partition → Node-A (admin, weight=100) removes `"Spam"` → Node-B (user, weight=10)
adds `"Spam"` → Reconnect.

- **OR-Set:** `["Spam"]` — add always wins regardless of who issued it. The admin's
  moderation decision is overridden by the troll's add. **FAILS.**
- **2P-Set:** `[]` — remove wins, correct outcome here. But the tombstone is permanent.
  If the admin later wants to legitimately re-add `"Spam"` (e.g. to quote it), they
  cannot. **Correct result, wrong reason — brittle.**
- **PW-Set:** `[]` — 100 > 10, remove weight wins. The admin's authority is respected.
  And this outcome is not permanent: a future admin add at weight 101 would override it.
  **SUCCEEDS.**

**Phase 2 — The Save:**
Partition → Node-A (admin, weight=100) adds `"Important Article"` → Node-B (user,
weight=10) removes `"Important Article"` → Reconnect.

- **OR-Set:** `["Important Article"]` — add wins, correct here, but only by coincidence
  because OR-Set always favours adds. There is no notion of intent.
- **2P-Set:** `[]` — the user's remove permanently tombstones the admin's protected
  content. The admin cannot recover it. **FAILS.**
- **PW-Set:** `["Important Article"]` — 100 > 10, add weight wins. Admin-protected
  content survives a low-weight remove. **SUCCEEDS.**

**Summary:** OR-Set fails Phase 1. 2P-Set fails Phase 2. PW-Set succeeds both via a
single consistent rule: higher weight wins.

---

## Register family — LWW-Register vs MV-Register

These CRDTs accept `set(value)` and hold a single logical value shared across replicas.

**LWW-Register (last-writer-wins):** each write carries a Lamport (logical) clock
timestamp. Merge always keeps the write with the higher timestamp. Equal timestamps are
broken deterministically by actor ID string comparison. One value survives; the other is
silently discarded.

**MV-Register (multi-value):** also uses Lamport clocks, but instead of picking a winner
it retains all writes at the maximum observed timestamp. Concurrent partitioned writes
often share the same timestamp, so the register surfaces all of them as an array. A
later causally-ordered write (strictly higher timestamp) collapses the array back to one
value.

---

### R01 — Concurrent set on two nodes

**Setup:** Partition → Node-A sets `"X"` → Node-B sets `"Y"` → Reconnect.

Both writes happen at logical time 1 on independent clocks — a true tie.

**LWW result:** `"Y"` — `"Node-B" > "Node-A"` lexicographically, so B wins the
tie-break. `"X"` is lost with no trace.
**MV result:** `["X", "Y"]` — both values retained, conflict visible.

---

### R02 — Sequential sets, no partition

**Setup:** Node-A sets `"X"` (healthy) → Node-B sets `"Y"` (healthy).

Node-B receives Node-A's sync message before writing, so its Lamport clock is already
ahead. No conflict possible.

**LWW result:** `"Y"` on all nodes.
**MV result:** `["Y"]` — single value, no conflict because B's timestamp strictly
dominates A's.

Both CRDTs agree. No-conflict baseline.

---

### R03 — Triple concurrent: all three nodes write

**Setup:** Partition → Node-A sets `"X"` → Node-B sets `"Y"` → Node-C sets `"Z"` →
Reconnect.

All three writes at logical time 1 — maximum conflict scenario.

**LWW result:** `"Z"` — `"Node-C"` has the lexicographically highest actor ID. Two
values silently discarded.
**MV result:** `["X", "Y", "Z"]` — all three retained.

---

### R04 — Shared baseline, concurrent divergence, causal resolution

**Setup:** Node-A sets `"V1"` (healthy, all nodes receive it) → Partition → Node-A sets
`"V2"` → Node-B sets `"V3"` → Reconnect → Node-C sets `"V4"` (healthy).

After the initial sync, all clocks are at 1. The partitioned writes land at timestamp 2
on their respective replicas — a tie. After reconnect, Node-C's write is at timestamp 3
(strictly higher than 2) because it has received the merged state.

**After reconnect:**
- LWW: `"V3"` — Node-B wins tie at timestamp 2.
- MV: `["V2", "V3"]` — both timestamp-2 values retained.

**After Node-C writes `"V4"`:**
- LWW: `"V4"`.
- MV: `["V4"]` — timestamp 3 dominates, conflict collapses.

Demonstrates that MV-Register conflicts are not permanent — a later causal write resolves
them.

---

### R05 — Concurrent identical writes

**Setup:** Partition → Node-A sets `"SameValue"` → Node-B sets `"SameValue"` →
Reconnect.

Both writes carry the same value and the same timestamp.

**LWW result:** `"SameValue"` — tie-break produces a winner, but result is the same
value anyway.
**MV result:** `["SameValue"]` — deduplication collapses the two concurrent identical
events to a single entry. No spurious duplicate.

Both agree. Confirms idempotent handling of concurrent identical writes.

---

### R06 — Multiple partition/reconnect cycles

**Setup:**
- Cycle 1: Partition → Node-A sets `"Round1-A"` → Node-B sets `"Round1-B"` → Reconnect.
- Cycle 2: Partition → Node-A sets `"Round2-A"` → Node-C sets `"Round2-C"` → Reconnect.

After Cycle 1 reconnect, all replicas have exchanged messages and their Lamport clocks
advance. The Cycle 2 writes happen at a strictly higher timestamp than Cycle 1 writes,
so they causally dominate.

**After Cycle 1 reconnect:**
- LWW: one value (Node-B wins tie in Cycle 1).
- MV: `["Round1-A", "Round1-B"]` — tied cycle-1 conflict.

**After Cycle 2 reconnect:**
- LWW: one value (`"Round2-C"` or `"Round2-A"` depending on tie-break).
- MV: collapses to only the Cycle 2 values — Cycle 1 conflict is superseded.

Confirms that logical clocks advance correctly across multiple heal cycles and that old
conflicts do not linger once newer writes dominate them.
