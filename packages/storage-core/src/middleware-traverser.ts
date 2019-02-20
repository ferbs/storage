import { IDataStore, IStorageLayer,} from "./storage-core";
import StorageRequestContext from "./storage-request-context";


export type MiddlewareTraverser = (ctx: StorageRequestContext) => Promise<any>;


export default function middlewareTraverser(dataStore: IDataStore, layers: IStorageLayer[]): MiddlewareTraverser {
  return (ctx: StorageRequestContext): Promise<any> => {
    const layerCount = layers.length;
    const callNextLayer = (ctx: StorageRequestContext, ndx: number): Promise<any> => {
      if (ctx.error) {
        return Promise.reject(ctx.error);
      }
      let res;
      if (ndx > layerCount) {
        res = Promise.resolve();
      } else {
        const methodName = ctx.methodName;
        if (ndx === layerCount) {
          const fn = dataStore[methodName];
          res = Promise.resolve(fn.call(dataStore, ctx, () => Promise.resolve()));
        } else if (ndx < layerCount) {
          const layer = layers[ndx];
          const fn = layer && layer[methodName];
          try {
            res = Promise.resolve(fn.call(layer, ctx, () => callNextLayer(ctx, ndx + 1)));
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
