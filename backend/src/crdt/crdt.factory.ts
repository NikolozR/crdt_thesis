import { Injectable } from '@nestjs/common';
import {
  CrdtType,
  LwwLocalOperation,
  OrSetLocalOperation,
  PwSetLocalOperation,
} from '../simulation/simulation.types';
import { ICRDT } from './crdt.interface';
import { TwoPhaseSetCrdt, TwoPhaseSetStateView, TwoPhaseSetSyncPayload } from './2p-set.crdt';
import { LwwRegisterCrdt, LwwRegisterStateView, LwwSyncPayload } from './lww-register.crdt';
import { MvRegisterCrdt, MvRegisterStateView, MvRegisterSyncPayload } from './mv-register.crdt';
import { OrSetCrdt, OrSetStateView, OrSetSyncPayload } from './or-set.crdt';
import { PwSetCrdt, PwSetStateView, PwSetSyncPayload } from './pw-set.crdt';

export type SupportedCrdtInstance =
  | ICRDT<OrSetLocalOperation, OrSetSyncPayload, OrSetStateView>
  | ICRDT<OrSetLocalOperation, TwoPhaseSetSyncPayload, TwoPhaseSetStateView>
  | ICRDT<LwwLocalOperation, LwwSyncPayload, LwwRegisterStateView>
  | ICRDT<LwwLocalOperation, MvRegisterSyncPayload, MvRegisterStateView>
  | ICRDT<PwSetLocalOperation, PwSetSyncPayload, PwSetStateView>;

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
      case 'pw-set':
        return new PwSetCrdt();
    }
  }
}
