import {DataMethod, IStorageDecorator, IStorageOpts, NextLayer} from "./storage-core";
import StorageRequestContext from "./storage-request-context";


export default class NoopDecorator implements IStorageDecorator {
  upstreamRequest!: (methodName: DataMethod, ...methodArgs: any[]) => Promise<any>;

  constructor(opts?: IStorageOpts) {
  }

  async get(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    await next();
  }

  async keys(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    await next();
  }

  async remove(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    await next();
  }

  async set(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    await next();
  }

  async snapshot(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    await next();
  }


  get isStorageDecorator(): boolean {
    return true;
  }
}