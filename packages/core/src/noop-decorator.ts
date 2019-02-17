import {IStorageDecorator, IStorageOpts, NextLayer} from "./storage-core";
import StorageRequestContext from "./storage-request-context";


export default class NoopDecorator implements IStorageDecorator {
  
  constructor(opts?: IStorageOpts) {
  }

  async get(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    await next();
  }

  async set(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    await next();
  }

  get isStorageDecorator(): boolean {
    return true;
  }
}