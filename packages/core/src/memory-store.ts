import {IDataStore, IStorageOpts, IStorageRequestContext, KeyValuePairs, NextLayer} from "./storage-core";


export default class MemoryStore implements IDataStore {
  private __snapshot: KeyValuePairs;
  constructor(opts=<IStorageOpts>{}) {
    this.__snapshot = opts.engine || {};
  }

  static storeType(): string {
    return 'memory';
  }

  async get(ctx: IStorageRequestContext): Promise<any> {
    let res = <KeyValuePairs>{};
    const keyDefaultPairs = <KeyValuePairs>ctx.keys;
    if (keyDefaultPairs) {
      Object.keys(keyDefaultPairs).forEach(key => {
        let val = this.__snapshot[key];
        if (typeof val === 'undefined' || (ctx.opts.useDefaultForNulls && val === null)) {
          val = keyDefaultPairs[key];
        }
        res[key] = val;
      });
    }
    ctx.result = res;
  }

}


