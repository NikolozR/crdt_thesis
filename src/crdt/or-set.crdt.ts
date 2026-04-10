import { Crdt } from './crdt.interface';
import { OrSetLocalOperation } from '../simulation/simulation.types';

export interface OrSetSyncAdd {
  readonly kind: 'add';
  readonly value: string;
  readonly tag: string;
}

export interface OrSetSyncRemove {
  readonly kind: 'remove';
  readonly value: string;
  readonly removedTags: string[];
}

export type OrSetSyncPayload = OrSetSyncAdd | OrSetSyncRemove;

export interface OrSetStateView {
  readonly type: 'or-set';
  readonly elements: string[];
}

/**
 * Observed-Remove Set with Add-Wins semantics.
 *
 * Why this works:
 * - Every add gets a unique tag. The value "exists" if at least one of its add tags
 *   has not been tombstoned.
 * - A remove only tombstones tags that were observed locally at remove-time.
 * - If an add happens concurrently with remove, remove cannot tombstone that unseen tag,
 *   therefore the element survives ("add wins").
 */
export class OrSetCrdt
  implements Crdt<OrSetLocalOperation, OrSetSyncPayload, OrSetStateView>
{
  private readonly addTagsByValue = new Map<string, Set<string>>();
  private readonly tombstonedTags = new Set<string>();

  applyLocalOperation(
    operation: OrSetLocalOperation,
    actorId: string,
  ): OrSetSyncPayload[] {
    if (operation.type === 'add') {
      const tag = `${actorId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
      const payload: OrSetSyncAdd = { kind: 'add', value: operation.value, tag };
      this.merge(payload);
      return [payload];
    }

    const observedTags = Array.from(this.addTagsByValue.get(operation.value) ?? []);
    const payload: OrSetSyncRemove = {
      kind: 'remove',
      value: operation.value,
      removedTags: observedTags,
    };
    this.merge(payload);
    return [payload];
  }

  merge(payload: OrSetSyncPayload): void {
    if (payload.kind === 'add') {
      const set = this.addTagsByValue.get(payload.value) ?? new Set<string>();
      set.add(payload.tag);
      this.addTagsByValue.set(payload.value, set);
      return;
    }

    for (const tag of payload.removedTags) {
      this.tombstonedTags.add(tag);
    }
  }

  getStateView(): OrSetStateView {
    const elements: string[] = [];

    for (const [value, tags] of this.addTagsByValue.entries()) {
      const hasLiveTag = Array.from(tags).some(
        (tag) => !this.tombstonedTags.has(tag),
      );

      if (hasLiveTag) {
        elements.push(value);
      }
    }

    return {
      type: 'or-set',
      elements: elements.sort(),
    };
  }
}
