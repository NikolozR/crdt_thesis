import { Injectable } from '@nestjs/common';
import {
  CrdtType,
  LwwLocalOperation,
  OrSetLocalOperation,
} from '../simulation/simulation.types';
import { ICRDT } from './crdt.interface';
import { TwoPhaseSetCrdt, TwoPhaseSetStateView, TwoPhaseSetSyncPayload } from './2p-set.crdt';
import { LwwRegisterCrdt, LwwRegisterStateView, LwwSyncPayload } from './lww-register.crdt';
import { MvRegisterCrdt, MvRegisterStateView, MvRegisterSyncPayload } from './mv-register.crdt';
import { OrSetCrdt, OrSetStateView, OrSetSyncPayload } from './or-set.crdt';

/**
 * Union of all concrete CRDT instances used in side-by-side comparison runs.
 * Each shares the same *family* of local operations (set vs add/remove) with
 * its sibling implementations.
 */
export type SupportedCrdtInstance =
  | ICRDT<OrSetLocalOperation, OrSetSyncPayload, OrSetStateView>
  | ICRDT<OrSetLocalOperation, TwoPhaseSetSyncPayload, TwoPhaseSetStateView>
  | ICRDT<LwwLocalOperation, LwwSyncPayload, LwwRegisterStateView>
  | ICRDT<LwwLocalOperation, MvRegisterSyncPayload, MvRegisterStateView>;

@Injectable()
export class CrdtFactory {
  create(crdtType: CrdtType): SupportedCrdtInstance {
    switch (crdtType) {
      case 'or-set':
        return new OrSetCrdt();
      case '2p-set':
        return new TwoPhaseSetCrdt();
      case 'lww-register':
        return new LwwRegisterCrdt();
      case 'mv-register':
        return new MvRegisterCrdt();
    }
  }
}
