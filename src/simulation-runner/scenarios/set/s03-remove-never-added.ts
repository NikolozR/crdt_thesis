import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

/**
 * S03 — Remove an element that was never added, on any node.
 *
 * OR-Set:  remove with no observed tags → remove payload has removedTags=[]
 *          → tombstone set stays empty → no effect, element stays absent.
 * 2P-Set:  value is added to `removed` tombstone set even though it was never
 *          in `added`. Future adds of "Ghost" will be permanently blocked.
 *
 * This exposes a key asymmetry: OR-Set remove of a phantom is a no-op,
 * but 2P-Set remove of a phantom permanently pollutes the tombstone set.
 */
export function s03RemoveNeverAdded(harness: SimulationHarness): ScenarioResult {
  const beforeRemove = harness.snapshot();

  harness.operate('Node-A', { type: 'remove', value: 'Ghost' });

  const afterPhantomRemove = harness.snapshot();

  // Now try to add it — 2P-Set will block this
  harness.operate('Node-B', { type: 'add', value: 'Ghost' });

  const afterAttemptedAdd = harness.snapshot();

  return {
    id: 's03',
    name: 'Remove of an element that was never added (phantom remove)',
    description:
      'Node-A removes "Ghost" which has never been added on any node. ' +
      'Then Node-B tries to add "Ghost". Tests how each CRDT handles a remove of a non-existent element.',
    family: 'set',
    crdts: ['or-set', '2p-set'],
    snapshots: [
      { label: 'before_remove', state: beforeRemove },
      { label: 'after_phantom_remove', state: afterPhantomRemove },
      { label: 'after_attempted_add', state: afterAttemptedAdd },
    ],
    conclusion:
      'OR-Set: phantom remove is harmless (no tags to tombstone); subsequent add succeeds — "Ghost" appears. ' +
      '2P-Set: phantom remove writes to the permanent tombstone set; subsequent add is silently blocked — "Ghost" never appears.',
  };
}
