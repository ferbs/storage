import { IDataStore, IStorageDecorator,} from "./storage-core";
import StorageRequestContext from "./storage-request-context";


export type MiddlewareTraverser = (ctx: StorageRequestContext) => Promise<any>;


export default function middlewareTraverser(dataStore: IDataStore, decorators: IStorageDecorator[]): MiddlewareTraverser {
  return (ctx: StorageRequestContext): Promise<any> => {
    const decoratorCount = decorators.length;
    const callNextLayer = (ctx: StorageRequestContext, ndx: number): Promise<any> => {
      if (ctx.error) {
        return Promise.reject(ctx.error);
      }
      let res;
      if (ndx > decoratorCount) {
        res = Promise.resolve();
      } else {
        const methodName = ctx.methodName;
        if (ndx === decoratorCount) {
          const fn = dataStore[methodName];
          res = Promise.resolve(fn.call(dataStore, ctx, () => Promise.resolve()));
        } else if (ndx < decoratorCount) {
          const decorator = decorators[ndx];
          const fn = decorator && decorator[methodName];
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
    };
    return callNextLayer(ctx, 0);
  };
}
