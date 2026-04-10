import { Injectable } from '@nestjs/common';
import { CrdtType, LwwLocalOperation, OrSetLocalOperation } from '../simulation/simulation.types';
import { Crdt } from './crdt.interface';
import { LwwRegisterCrdt, LwwRegisterStateView, LwwSyncPayload } from './lww-register.crdt';
import { OrSetCrdt, OrSetStateView, OrSetSyncPayload } from './or-set.crdt';

export type SupportedCrdtInstance =
  | Crdt<OrSetLocalOperation, OrSetSyncPayload, OrSetStateView>
  | Crdt<LwwLocalOperation, LwwSyncPayload, LwwRegisterStateView>;

@Injectable()
export class CrdtFactory {
  create(crdtType: CrdtType): SupportedCrdtInstance {
    if (crdtType === 'or-set') {
      return new OrSetCrdt();
    }

    return new LwwRegisterCrdt();
  }
}
