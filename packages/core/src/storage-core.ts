import * as serializedConfig from './serialized-config';
import {DecoratorFactoryFunction, StoreFactoryFunction} from "./serialized-config";
import NormalizeArgsDecorator from "./normalize-args-decorator";
import middlewareTraverser, {MiddlewareTraverser} from "./middleware-traverser";
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
  Clear = 'clear',
  Get = 'get',
  Keys = 'keys',
  Remove = 'remove',
  Set = 'set',
  Snapshot = 'snapshot',
}
/**
 * Interface for decorators/transforms and underlying stores. It is simpler than the public-facing interface. They can expect
 * all input parameters to have been normalized, and do not need to implement alias method names and such.
 */
export interface IDataStoreLayer {
  clear: DataStoreMethod;
  get: DataStoreMethod;
  keys: DataStoreMethod;
  remove: DataStoreMethod;
  set: DataStoreMethod;
  snapshot: DataStoreMethod;
  // tried using computed property names here but they confuse my IDE.. eg: [ DataMethod.Get ]: DataStoreMethod
}

export interface IStorageDecorator extends IDataStoreLayer {
  isStorageDecorator: boolean;
}

export interface IDataStore extends IDataStoreLayer {
  isDataStore: boolean;
}

export interface IStorageOpts {
  transforms?: Array<string | IStorageDecorator>;
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
  readonly dataStore: IDataStore;
  readonly storageConstructorOpts: IGenericOpts;
  transforms: IStorageDecorator[];
  _middlewareTransformer = <MiddlewareTraverser | null> null;

  constructor(dataStore: IDataStore | string | LocalForageDbMethodsCore, opts=<IStorageOpts>{}) {
    this.storageConstructorOpts = opts;
    if (typeof dataStore === 'string') {
      this.dataStore = serializedConfig.storeFactory(dataStore, opts);
    } else if (this._isLocalForage(dataStore)) {
      this.dataStore = new LocalForageAdapterStore(dataStore as LocalForageDbMethodsCore);
    } else if (this._isDataStore(dataStore)) {
      this.dataStore = dataStore as IDataStore;
    } else {
      throw new Error('Data store required');
    }

    this.transforms = [ new NormalizeArgsDecorator(opts) ];
    serializedConfig.appendDecoratorsFromConfig(this, opts.transforms);
  }

  static registerStoreFactory(engineType: string, engineFactory: StoreFactoryFunction): void {
    serializedConfig.registerStore(engineType, engineFactory);
  }

  static registerDecoratorFactory(engineType: string, engineFactory: DecoratorFactoryFunction): void {
    serializedConfig.registerDecorator(engineType, engineFactory);
  }

  clear(opts?: IGenericOpts): Promise<void>;
  clear(opts?: IGenericOpts, callback?: (err: any) => void): void;
  clear(...args: any[]): Promise<any> | void {
    return this._dataRequestWithPromiseOrCallback(DataMethod.Clear, args);
  }
  
  get<T>(keys: ItemKey | ItemKeys | KeyValuePairs, opts?: IGenericOpts): Promise<T>;
  get<T>(keys: ItemKey | ItemKeys | KeyValuePairs, opts?: IGenericOpts, callback?: NodejsCallback): void;
  get(...args: any[]): Promise<any> | void {
    return this._dataRequestWithPromiseOrCallback(DataMethod.Get, args);
  }

  /**
   * Compatible with LocalForage. Similar to `get` but it does not accept options that are passed along to transforms.
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
    const iterator = args.shift();
    const cb = args.pop();
    const loop = (async () => {
      const keys = await (this._dataRequestWithPromiseOrCallback(DataMethod.Keys, []) as Promise<string[]>);
      let ndx = 0;
      for (let key of keys) {
        ndx += 1; // 1-based in localForage (says docs.. todo: try/test)
        const val = await this.get(key);
        const out = iterator(val, key, ndx);
        if (out === void(0)) {
          break;
        }
      }
    });
    return this._useCallbackOrReturnPromise(loop(), cb);
  }

  keys(opts?: IGenericOpts): Promise<string[]>;
  keys(callback: NodejsCallback, opts?: IGenericOpts): void;
  keys(...args: any[]): Promise<any> | void {
    return this._dataRequestWithPromiseOrCallback(DataMethod.Keys, args);
  }

  length(): Promise<number>;
  length(callback: NodejsCallback): void;
  length(...args: any[]): Promise<any> | void {
    const cb = args.pop();
    const promisedLength = (this._dataRequestWithPromiseOrCallback(DataMethod.Keys, []) as Promise<any>)
      .then(keys => Promise.resolve(keys.length));
    return this._useCallbackOrReturnPromise(promisedLength, cb);
  }

  remove(keys: ItemKey | ItemKeys, opts?: IGenericOpts): Promise<any>;
  remove(keys: ItemKey | ItemKeys, opts?: IGenericOpts, callback?: NodejsCallback): void;
  remove(...args: any[]): Promise<any> | void {
    return this._dataRequestWithPromiseOrCallback(DataMethod.Remove, args);
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
    return this._dataRequestWithPromiseOrCallback(DataMethod.Set, args);
  }

  setItem<T>(key: string, value: T): Promise<T>;
  setItem<T>(key: string, value: T, callback: (err: any, value: T) => void): void;
  setItem(key: string, value: any, callback?: NodejsCallback): Promise<any> | void {
    return this.set(key, value, callback);
  }

  snapshot(opts?: IGenericOpts): Promise<string[]>;
  snapshot(opts?: IGenericOpts, callback?: NodejsCallback): void;
  snapshot(...args: any[]): Promise<any> | void {
    return this._dataRequestWithPromiseOrCallback(DataMethod.Snapshot, args);
  }


  useTransform(raw: string | IStorageDecorator, opts?: IGenericOpts) {
    let decorator;
    if (typeof raw === 'string') {
      decorator = serializedConfig.decoratorFactory(raw, opts);
    } else {
      decorator = raw;
    }
    decorator && this.transforms.push(decorator);
    this._middlewareTransformer = null; // to force a middleware rebuild should it have been used already
  }

  _getMiddlewareTraverser(): MiddlewareTraverser {
    if (!this._middlewareTransformer) {
      this._middlewareTransformer = middlewareTraverser(this.dataStore, this.transforms);
    }
    return this._middlewareTransformer;
  }

  _dataRequestWithPromiseOrCallback(methodName: DataMethod, args: any[]): Promise<any> | void {
    const ctx = new StorageRequestContext(methodName, args, {
      storageConstructorOpts: this.storageConstructorOpts
    });
    const promise = this._makeTransformedRequest(ctx);
    return this._useCallbackOrReturnPromise(promise, ctx.nodejsCallback);
  }

  async _makeTransformedRequest(ctx: StorageRequestContext): Promise<any> {
    const middlewareTransformer = this._getMiddlewareTraverser();
    try {
      await middlewareTransformer(ctx);
    } catch (err) {
      return Promise.reject(err);
    }
    if (ctx.error) {
      return Promise.reject(ctx.error)
    } else {
      return Promise.resolve(ctx.result);
    }
  }


  private _isLocalForage(val: any): boolean {
    return val && [ 'getItem', 'setItem' ].every(m => typeof val[m] === 'function');
  }

  private _isDataStore(val: any): boolean {
    return val && val.isDataStore && [ 'get', 'set' ].every(m => typeof val[m] === 'function');
  }

  _useCallbackOrReturnPromise(actualPromise: Promise<any>, cb?: NodejsCallback): Promise<any> | void {
    if (typeof cb === 'function') {
      actualPromise.then(result => cb(null, result)).catch(err => cb(err));
    } else {
      return actualPromise;
    }
  }

}

