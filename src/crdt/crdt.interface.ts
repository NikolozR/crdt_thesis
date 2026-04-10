/**
 * Generic CRDT contract used by NodeService.
 *
 * The simulation engine does not need to know CRDT internals.
 * It only relies on a consistent set of lifecycle methods:
 * - apply local operation
 * - convert local change into sync payloads
 * - merge remote payload
 * - expose user-facing state snapshot
 */
export interface Crdt<TLocalOperation, TSyncPayload, TStateView> {
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
