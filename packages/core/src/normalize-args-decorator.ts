import {IStorageDecorator} from "core/lib/storage-core";
import {IStorageOpts, IStorageRequestContext, NextLayer} from "./storage-core";


export default class NormalizeArgsDecorator implements IStorageDecorator {
  constructor(opts: IStorageOpts) {

  }

  async get(ctx: IStorageRequestContext, next: NextLayer): Promise<any> {
    // @ts-ignore
    ctx.keys = { [ ctx.keys ]: null }; // tmp - remove! placeholder to see if jest is working
    await next();
  }

  isStorageDecorator = true;
}