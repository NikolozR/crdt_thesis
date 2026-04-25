/**
 * Standard CRDT contract for this simulation (`ICRDT`).
 *
 * Each implementation maps the same *user-facing* local operations (see
 * `simulation.types.ts`) to replica-specific sync payloads. Peers merge those
 * payloads to converge; the merge rules encode the semantics you compare in
 * the thesis (add-wins vs remove-wins, single winner vs concurrent values).
 */
export interface ICRDT<TLocalOperation, TSyncPayload, TStateView> {
  /**
   * Applies a local operation and returns one or more sync payloads
   * that should be sent to peers. Returning arrays allows CRDTs that
   * decompose one user action into multiple internal messages.
   */
  applyLocalOperation(
    operation: TLocalOperation,
    actorId: string,
  ): TSyncPayload[];

  /**
   * Merges a sync payload into local replica state.
   * Merge logic must be commutative, associative, and idempotent
   * (the key properties that guarantee eventual convergence).
   */
  merge(payload: TSyncPayload): void;

  /**
   * Returns a stable, serialization-friendly state for the REST API.
   */
  getStateView(): TStateView;
}
