import {DataStoreMethod, IDataStore, IDataStoreLayer, IStorageAdapter, IStorageRequestContext,} from "./storage-core";


export type ComposedMiddleware = (ctx: IStorageRequestContext) => Promise<any>;


export default function middlewareTraverser(dataStore: IDataStore, adapters: IStorageAdapter[]): ComposedMiddleware {
  return (ctx: IStorageRequestContext): Promise<any> => {
    const adapterCount = adapters.length;
    const callNextLayer = (ctx: IStorageRequestContext, ndx: number): Promise<any> => {
      if (ctx.error) {
        return Promise.reject(ctx.error);
      }
      let res;
      if (ndx > adapterCount) {
        res = Promise.resolve();
      } else {
        const methodName = ctx.methodName;
        if (ndx === adapterCount) {
          const fn = _storageMethod(dataStore, methodName);
          res = Promise.resolve(fn.call(dataStore, ctx, () => Promise.resolve()));
        } else if (ndx < adapterCount) {
          const adapter = adapters[ndx];
          const fn = adapter && _storageMethod(adapter, methodName);
          try {
            res = Promise.resolve(fn.call(adapter, ctx, () => callNextLayer(ctx, ndx + 1)));
          } catch (err) {
            res = Promise.reject(err)
          }
        } else {
          res = Promise.resolve();
        }
      }
      return res;
    }
    return callNextLayer(ctx, 0);
  };

}

function _storageMethod(store: IDataStoreLayer, methodName: string): DataStoreMethod {
  // @ts-ignore
  return store[methodName];
}

