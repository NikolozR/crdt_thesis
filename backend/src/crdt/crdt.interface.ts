export interface ICRDT<TLocalOperation, TSyncPayload, TStateView> {
  applyLocalOperation(
    operation: TLocalOperation,
    actorId: string,
  ): TSyncPayload[];

  merge(payload: TSyncPayload): void;

  getStateView(): TStateView;
}
