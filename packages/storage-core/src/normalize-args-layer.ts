import {DataMethod, IStorageOpts, NextLayer} from "./storage-core";
import StorageRequestContext from "./storage-request-context";
import NoopLayer from "./noop-layer";


export default class NormalizeArgsLayer extends NoopLayer {
  upstreamRequest!: (methodName: DataMethod, ...methodArgs: any[]) => Promise<any>;

  constructor(opts?: IStorageOpts) {
    super(opts);
  }

  async get(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    const userKeys = ctx.keysForGet || [];
    const isSoloGet = userKeys.length === 1;
    await next();
    if (isSoloGet && typeof ctx.result === 'object') {
      const keys = Object.keys(ctx.result); // note: it extracts any solo key, even if different from the request key... might change it later to require an exact match, dunno
      if (keys.length === 1) {
        ctx.result = ctx.result[keys[0]];
      }
    }
  }

}

