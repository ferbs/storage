import {DataStoreMethod, IDataStore, IDataStoreLayer, IStorageDecorator, IStorageRequestContext,} from "./storage-core";


export type ComposedMiddleware = (ctx: IStorageRequestContext) => Promise<any>;


export default function middlewareTraverser(dataStore: IDataStore, decorators: IStorageDecorator[]): ComposedMiddleware {
  return (ctx: IStorageRequestContext): Promise<any> => {
    const decoratorCount = decorators.length;
    const callNextLayer = (ctx: IStorageRequestContext, ndx: number): Promise<any> => {
      if (ctx.error) {
        return Promise.reject(ctx.error);
      }
      let res;
      if (ndx > decoratorCount) {
        res = Promise.resolve();
      } else {
        const methodName = ctx.methodName;
        if (ndx === decoratorCount) {
          const fn = _storageMethod(dataStore, methodName);
          res = Promise.resolve(fn.call(dataStore, ctx, () => Promise.resolve()));
        } else if (ndx < decoratorCount) {
          const decorator = decorators[ndx];
          const fn = decorator && _storageMethod(decorator, methodName);
          try {
            res = Promise.resolve(fn.call(decorator, ctx, () => callNextLayer(ctx, ndx + 1)));
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

