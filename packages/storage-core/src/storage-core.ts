import * as serializedConfig from './serialized-config';
import {LayerFactoryFunction, StoreFactoryFunction} from "./serialized-config";
import NormalizeArgsLayer from "./normalize-args-layer";
import StorageRequestContext from "./storage-request-context";
import LocalForageAdapterStore from "./local-forage-adapter-store";


type NodejsCallback = (err: any, value?: any) => void;


/**
 * localForage interface, for API compatability.
 *
 * Copied from localForage/typings/localforage.d.ts commit 349a874. Supporting its core public storage methods. (todo: or import as dev dependency, to use its typescript definitions directly?)
 */
export interface LocalForageDbMethodsCore {
  getItem<T>(key: string, callback?: (err: any, value: T) => void): Promise<T>;

  setItem<T>(key: string, value: T, callback?: (err: any, value: T) => void): Promise<T>;

  removeItem(key: string, callback?: (err: any) => void): Promise<void>;

  clear(callback?: (err: any) => void): Promise<void>;

  length(callback?: (err: any, numberOfKeys: number) => void): Promise<number>;

  // note: skipping. (assuming ok to ignore "key" method for now.)
  // key(keyIndex: number, callback?: (err: any, key: string) => void): Promise<string>;

  keys(callback?: (err: any, keys: string[]) => void): Promise<string[]>;


  iterate<T, U>(iteratee: (value: T, key: string, iterationNumber: number) => U,
                callback?: (err: any, result: U) => void): Promise<U>;
}

export type NextLayer = () => Promise<any>;
export type DataStoreMethod = (ctx: StorageRequestContext, next: NextLayer) => Promise<any>;

export enum DataMethod {
  Get = 'get',
  Keys = 'keys',
  Remove = 'remove',
  Set = 'set',
  Snapshot = 'snapshot',
}
/**
 * Interface for layers/layers and underlying stores. It is simpler than the public-facing interface. They can expect
 * all input parameters to have been normalized, and do not need to implement alias method names and such.
 */
export interface IDataStoreLayer {
  get: DataStoreMethod;
  keys: DataStoreMethod;
  remove: DataStoreMethod;
  set: DataStoreMethod;
  snapshot: DataStoreMethod;
  // tried using computed property names here but they confuse my IDE.. eg: [ DataMethod.Get ]: DataStoreMethod
}
type UpstreamRequestFunction = (methodName: DataMethod, ...methodArgs: any[]) => Promise<any>;

export interface IStorageLayer extends IDataStoreLayer {
  isStorageLayer: boolean;

  /**
   * This `upstreamRequest` method lets a layer make additional storage method calls, even while handling a user request.
   *
   * For example, some fictitious WriteOnceLayer might check if a key exists before continuing. Within its `set` method,
   * it might fetch existing keys with:
   *   `const keys = await this.upstreamRequest(DataMethod.Keys);`

   * Only the layers/layers added subsequent to the current/calling layer are applied, making the behavior consistent
   * with how its main data methods normally work.
   *
   * This method is dynamically added to your layer when applied (eg, via `store.useLayer(myLayer)`.
   * When using TypeScript, you can declare its presence with:
   *
   *     upstreamRequest!: (methodName: DataMethod, ...methodArgs: any[]) => Promise<any>;
   *
   * (First added to let the ExpirationLayer check for and remove expired items.)
   * @param ctx
   */
  upstreamRequest: (methodName: DataMethod, ...methodArgs: any[]) => Promise<any>
}

export interface IDataStore extends IDataStoreLayer {
  // todo: dataStoreRegistryInfo and remove isDataStore.
  isDataStore: boolean;
}

export interface IStorageOpts {
  layers?: Array<string | IStorageLayer>;
  engine?: any;
}

export interface IGenericOpts {
  [ key: string ]: any;
}

export type ItemKey = string;
export type ItemKeys = string[];
export interface KeyValuePairs {
  [ key: string ]: any;
}



export default class Storage implements LocalForageDbMethodsCore {
  readonly backingStore: IDataStore;
  readonly storageConstructorOpts: IGenericOpts;
  layers: IStorageLayer[];

  constructor(dataStore: IDataStore | string | LocalForageDbMethodsCore, opts=<IStorageOpts>{}) {
    this.storageConstructorOpts = opts;
    if (typeof dataStore === 'string') {
      this.backingStore = serializedConfig.storeFactory(dataStore, opts);
    } else if (this._isLocalForage(dataStore)) {
      this.backingStore = new LocalForageAdapterStore(dataStore as LocalForageDbMethodsCore);
    } else if (this._isDataStore(dataStore)) {
      this.backingStore = dataStore as IDataStore;
    } else {
      throw new Error('Data store required');
    }

    this.layers = [ new NormalizeArgsLayer(opts) ];
    serializedConfig.appendLayersFromConfig(this, opts.layers);
  }

  static registerStoreFactory(storeType: string, engineFactory: StoreFactoryFunction): void {
    serializedConfig.registerStore(storeType, engineFactory);
  }

  static registerLayerFactory(layerType: string, engineFactory: LayerFactoryFunction): void {
    serializedConfig.registerLayer(layerType, engineFactory);
  }

  clear(): Promise<void>;
  clear(callback: (err: any) => void): void;
  clear(...args: any[]): Promise<any> | void {
    return this._useCallbackOrReturnPromise(this._derivedClear(), args[args.length - 1]);
  }

  get<T>(keys: ItemKey | ItemKeys | KeyValuePairs, opts?: IGenericOpts): Promise<T>;
  get<T>(keys: ItemKey | ItemKeys | KeyValuePairs, opts?: IGenericOpts, callback?: NodejsCallback): void;
  get(...args: any[]): Promise<any> | void {
    return this._dataRequestWithPromiseOrCallback(DataMethod.Get, ...args);
  }

  /**
   * Compatible with LocalForage. Similar to `get` but it does not accept options that are passed along to layers.
   * @param key
   * @param callback
   */
  getItem<T>(key: string, callback?: NodejsCallback): void;
  getItem<T>(key: string): Promise<T>;
  getItem(key: string, callback?: NodejsCallback): Promise<any> | void {
    return this.get(key, callback);
  }

  /**
   * Consider using store.snapshot().
   * Including this for API compatibility with LocalForage..
   * @param iteratee
   * @param callback
   */
  iterate<T, U>(iteratee: (value: T, key: string, iterationNumber: number) => U,
                callback?: (err: any, result: U) => void): Promise<U>;
  iterate(iteratee: (value: any, key: string, iterationNumber: number) => any, callback: NodejsCallback): void;
  iterate(iteratee: (value: any, key: string, iterationNumber: number) => any): Promise<any>;
  iterate(...args: any[]): Promise<any> | void {
    const iterator = args.shift(); // if you don't like the look of shift and change this, make sure to check args.length > 1 before using the iterator as the callback
    return this._useCallbackOrReturnPromise(this._derivedIterate(iterator), args[args.length - 1]);
  }

  keys(opts?: IGenericOpts): Promise<string[]>;
  keys(callback: NodejsCallback, opts?: IGenericOpts): void;
  keys(...args: any[]): Promise<any> | void {
    return this._dataRequestWithPromiseOrCallback(DataMethod.Keys, ...args);
  }

  length(): Promise<number>;
  length(callback: NodejsCallback): void;
  length(...args: any[]): Promise<any> | void {
    return this._useCallbackOrReturnPromise(this._derivedLength(), args[args.length - 1]);
  }

  remove(keys: ItemKey | ItemKeys, opts?: IGenericOpts): Promise<any>;
  remove(keys: ItemKey | ItemKeys, opts?: IGenericOpts, callback?: NodejsCallback): void;
  remove(...args: any[]): Promise<any> | void {
    return this._dataRequestWithPromiseOrCallback(DataMethod.Remove, ...args);
  }

  removeItem(key: string): Promise<void>;
  removeItem(key: string, callback: NodejsCallback): void;
  removeItem(key: string, callback?: NodejsCallback): Promise<any> | void {
    return this.remove(key, callback);
  }

  set(keyValuePairs: KeyValuePairs, opts?: IGenericOpts): Promise<any>;
  set(keyValuePairs: KeyValuePairs, opts?: IGenericOpts, callback?: NodejsCallback): void;
  set(key: string, value: any, opts?: IGenericOpts): Promise<any>;
  set(key: string, value: any, opts?: IGenericOpts, callback?: NodejsCallback): void;
  set(...args: any[]): Promise<any> | void {
    return this._dataRequestWithPromiseOrCallback(DataMethod.Set, ...args);
  }

  setItem<T>(key: string, value: T): Promise<T>;
  setItem<T>(key: string, value: T, callback: (err: any, value: T) => void): void;
  setItem(key: string, value: any, callback?: NodejsCallback): Promise<any> | void {
    return this.set(key, value, callback);
  }

  snapshot(opts?: IGenericOpts): Promise<string[]>;
  snapshot(opts?: IGenericOpts, callback?: NodejsCallback): void;
  snapshot(...args: any[]): Promise<any> | void {
    return this._dataRequestWithPromiseOrCallback(DataMethod.Snapshot, ...args);
  }

  useTransform(raw: string | IStorageLayer, opts?: IGenericOpts) {
    let layer;
    if (typeof raw === 'string') {
      layer = serializedConfig.layerFactory(raw, opts);
    } else {
      layer = raw;
    }
    if (layer) {
      this._extendLayer(layer);
      this.layers.push(layer);
    }
  }

  insertTransformAt(layer: IStorageLayer, pos: number) {
    this._extendLayer(layer);
    this.layers.splice(pos, 0, layer);
  }

  createSubsetStore(opts=<IStorageOpts>{}): Storage {
    return new Storage(this, opts);
  }

  _upstreamRequestFnForLayer(layer: IStorageLayer): UpstreamRequestFunction {
    return (methodName: DataMethod, ...methodArgs: any[]): Promise<any> => {
      const ndx = this.layers.findIndex(d => d === layer);
      if (ndx >= 0) {
        const layers = this.layers.slice(ndx + 1);
        const {backingStore, storageConstructorOpts} = this;
        const partialCtx = new StorageRequestContext({ methodName, backingStore, storageConstructorOpts, layers }, ...methodArgs);
        return partialCtx.makeTransformedRequest();
      } else {
        // reachable?
        return Promise.reject('LayerMissing')
      }
    };
  }

  async _derivedClear(): Promise<any> {
    const keys = await this._dataRequest(DataMethod.Keys); // needs to go through Keys because layers often create their own namespaces on top of a data store holding unrelated items (that should not be removed)
    return this._dataRequest(DataMethod.Remove, keys);
  }

  async _derivedLength(): Promise<any> {
    const keys = await this._dataRequest(DataMethod.Keys);
    return keys.length;
  }

  async _derivedIterate(iterator: Function): Promise<any> {
    const keys = await this._dataRequest(DataMethod.Keys);
    let ndx = 0;
    for (let key of keys) {
      ndx += 1; // localForage docs says index is 1-based
      const val = await this.get(key);
      const out = iterator(val, key, ndx);
      if (out === void(0)) {
        break;
      }
    }
  }

  _extendLayer(layer: IStorageLayer) {
    layer.upstreamRequest = this._upstreamRequestFnForLayer(layer);
  }

  private _isLocalForage(val: any): boolean {
    return val && [ 'getItem', 'setItem' ].every(m => typeof val[m] === 'function');
  }

  private _isDataStore(val: any): boolean {
    return val && val.isDataStore && [ 'get', 'set' ].every(m => typeof val[m] === 'function');
  }

  private _dataRequest(methodName: DataMethod, ...args: any[]): Promise<any> {
    const { backingStore, layers, storageConstructorOpts } = this;
    const ctx = new StorageRequestContext({ methodName, backingStore, layers, storageConstructorOpts }, ...args);
    return ctx.makeTransformedRequest();
  }

  private _dataRequestWithPromiseOrCallback(methodName: DataMethod, ...args: any[]): Promise<any> | void {
    let cb;
    if (typeof args[args.length - 1] === 'function') {
      cb = args.pop();
    }
    return this._useCallbackOrReturnPromise(this._dataRequest(methodName, ...args), cb);
  }

  private _useCallbackOrReturnPromise(promise: Promise<any>, cb?: NodejsCallback): Promise<any> | void {
    if (typeof cb === 'function') {
      promise.then(result => cb(null, result)).catch(err => cb(err));
    } else {
      return promise;
    }
  }

}


export {
  StorageRequestContext,
}