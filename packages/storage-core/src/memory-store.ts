import {IDataStore, IStorageOpts, KeyValuePairs, NextLayer} from "./storage-core";
import StorageRequestContext from "./storage-request-context";


export default class MemoryStore implements IDataStore {
  private readonly _snapshot: KeyValuePairs;
  constructor(opts=<IStorageOpts>{}) {
    this._snapshot = opts.engine || {};
  }

  static storeType(): string {
    return 'memory';
  }

  async get(ctx: StorageRequestContext): Promise<any> {
    let res = <KeyValuePairs>{};
    (ctx.keysForGet || []).forEach(k => {
      res[k] = this._snapshot[k];
    });
    ctx.result = res;
  }

  async clear(ctx: StorageRequestContext): Promise<any> {
    // note: deleting in a loop rather than resetting to a fresh object to preserve any references to the passed in engine
    Object.keys(this._snapshot).forEach(k => {
      delete this._snapshot[k];
    });
  }

  async keys(ctx: StorageRequestContext): Promise<any> {
    ctx.result = Object.keys(this._snapshot);
  }

  async remove(ctx: StorageRequestContext): Promise<any> {
    (ctx.keysForRemove || []).forEach(k => {
      delete this._snapshot[k];
    });
  }

  async set(ctx: StorageRequestContext): Promise<any> {
    Object.assign(this._snapshot, ctx.keyValuePairsForSet);
  }

  async snapshot(ctx: StorageRequestContext): Promise<any> {
    ctx.result = { ...this._snapshot }; // todo: or deep clone?
  }

  isDataStore = true;
}


