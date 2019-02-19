import {DataMethod, IStorageOpts, NextLayer} from "./storage-core";
import StorageRequestContext from "./storage-request-context";
import NoopDecorator from "./noop-decorator";


export default class NormalizeArgsDecorator extends NoopDecorator {
  upstreamRequest!: (methodName: DataMethod, ...methodArgs: any[]) => Promise<any>;

  constructor(opts?: IStorageOpts) {
    super(opts);
  }

  async get(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    await next();
    if (ctx.isSoloGet && typeof ctx.result === 'object') {
      const keys = Object.keys(ctx.result);
      if (keys.length === 1) {
        ctx.result = ctx.result[keys[0]];
      }
    }
  }

}

