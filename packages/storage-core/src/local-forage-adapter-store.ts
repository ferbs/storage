import {IDataStore, KeyValuePairs, LocalForageDbMethodsCore} from "./storage-core";
import StorageRequestContext from "./storage-request-context";


export default class LocalForageAdapterStore implements IDataStore {
  readonly localForage: LocalForageDbMethodsCore;

  constructor(lf: LocalForageDbMethodsCore) {
    this.localForage = lf;
  }

  async get(ctx: StorageRequestContext): Promise<any> {
    let res = <KeyValuePairs>{};
    const lf = this.localForage;
    const keys = ctx.keysForGet || [];
    for (let key of keys) {
      res[key] = await lf.getItem(key);
    }
    ctx.result = res;
  }

  async clear(ctx: StorageRequestContext): Promise<any> {
    await this.localForage.clear();
    ctx.result = true;
  }

  async keys(ctx: StorageRequestContext): Promise<any> {
    ctx.result = await this.localForage.keys();
  }

  async remove(ctx: StorageRequestContext): Promise<any> {
    const lf = this.localForage;
    const keys = ctx.keysForRemove || [];
    for (let key of keys) {
      await lf.removeItem(key);
    }
    ctx.result = true;
  }

  async set(ctx: StorageRequestContext): Promise<any> {
    const lf = this.localForage;
    const data = ctx.keyValuePairsForSet || {};
    const keys = Object.keys(data);
    for (let key of keys) {
      await lf.setItem(key, data[key]);
    }
    ctx.result = true;
  }

  async snapshot(ctx: StorageRequestContext): Promise<any> {
    const result = {} as any;
    const lf = this.localForage;
    const keys = await this.localForage.keys(); // note: first tried using lf.iterate but it stops after first item (even when explicitly returning a value)
    for (let key of keys) {
      result[key] = await lf.getItem(key);
    }
    ctx.result = result;
  }


  isDataStore = true;
  static storeType(): string {
    return 'localForage';
  }

}