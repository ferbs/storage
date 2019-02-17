import {IDataStore, IStorageOpts, KeyValuePairs, NextLayer} from "./storage-core";
import StorageRequestContext from "./storage-request-context";


export default class MemoryStore implements IDataStore {
  private __snapshot: KeyValuePairs;
  constructor(opts=<IStorageOpts>{}) {
    this.__snapshot = opts.engine || {};
  }

  static storeType(): string {
    return 'memory';
  }

  async get(ctx: StorageRequestContext): Promise<any> {
    let res = <KeyValuePairs>{};
    (ctx.keysToGet || []).forEach(k => {
      res[k] = this.__snapshot[k];
    });
    ctx.result = res;
  }

  async set(ctx: StorageRequestContext): Promise<any> {
    // todo
  }

  isDataStore = true;
}


