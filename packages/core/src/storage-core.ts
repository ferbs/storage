import {registerStore, registerAdapter, adapterFactory, StoreFactoryFunction, AdapterFactoryFunction, storeFactory,} from './registration';
import NormalizeArgsAdapter from "./normalize-args-adapter";
import middlewareTraverser, {ComposedMiddleware} from "./middleware-traverser";


export interface IStorageRequestContext extends KeyValuePairs {
  methodName: string;
  opts: KeyValuePairs;

  keys?: GetParam;
  nodejsCallback?: (...args: any[]) => any;
  result?: any;
}

export type NextLayer = () => Promise<any>;
export type DataStoreMethod = (ctx: IStorageRequestContext, next: NextLayer) => Promise<any>;

export interface IDataStoreLayer {
  get: DataStoreMethod;
}

export interface IStorageAdapter extends IDataStoreLayer {
  isStorageAdapter: boolean;
}

export interface IDataStore extends IDataStoreLayer {
}

export interface IStorageOpts {
  adapters?: Array<string | IStorageAdapter>;
  engine?: any;
}

export interface IGenericOpts {
  [ key: string ]: any;
}
export interface KeyValuePairs {
  [ key: string ]: any;
}
type Key = string;
type Keys = string[];

type GetParam = Key | Keys | KeyValuePairs;


export default class Storage {
  readonly dataStore: IDataStore;
  adapters: IStorageAdapter[];
  _middlewareTransformer = <ComposedMiddleware | null> null;

  constructor(dataStore: IDataStore | string, opts=<IStorageOpts>{}) {
    this.dataStore = storeFactory(dataStore, opts);
    this.adapters = [ new NormalizeArgsAdapter(opts) ]
    this.useAdapters(opts.adapters);
  }

  static registerStoreFactory(engineType: string, engineFactory: StoreFactoryFunction): void {
    registerStore(engineType, engineFactory);
  }

  static registerAdapterFactory(engineType: string, engineFactory: AdapterFactoryFunction): void {
    registerAdapter(engineType, engineFactory);
  }

  async get(keys: GetParam, ...extraArgs: any): Promise<any> {
    const ctx = this._createContext('get', { keys }, extraArgs);
    return this._makeTransformedRequest(ctx);
  }

  useAdapter(adapterType: string, opts?: IGenericOpts) {
    this.adapters.push(adapterFactory(adapterType, opts));
    this._middlewareTransformer = null;
  }

  useAdapters(configs: any): void {
    if (Array.isArray(configs)) {
      configs.forEach(c => this._appendAdapterFromConfig(c));
    } else {
      this._appendAdapterFromConfig(configs);
    }
  }

  _createContext(methodName: string, contextData: IGenericOpts, extraArgs: any[]): IStorageRequestContext {
    let nodejsCallback;
    extraArgs = extraArgs || []
    if (typeof extraArgs[extraArgs.length - 1] === 'function') {
      nodejsCallback = extraArgs.pop();
    }
    const opts = Object.assign({}, ...extraArgs);
    return Object.assign({}, contextData, {
      methodName,
      nodejsCallback,
      opts,
    });
  }

  async _makeTransformedRequest(ctx: IStorageRequestContext): Promise<any> {
    if (!this._middlewareTransformer) {
      this._middlewareTransformer = middlewareTraverser(this.dataStore, this.adapters);
    }
    try {
      await this._middlewareTransformer(ctx);
    } catch (err) {
      return Promise.reject(err);
    }
    if (ctx.error) {
      return Promise.reject(ctx.error)
    } else {
      return Promise.resolve(ctx.result);
    }
  }


  _appendAdapterFromConfig(config: any): void {
    if (!config) {
      return;
    }
    if (typeof config === 'object' && !Array.isArray(config)) {
      Object.keys(config).forEach(k => this.useAdapter(k, config[k]));
      return;
    }
    let adapterType, opts;
    if (Array.isArray(config)) { // case of a tuple, eg [ 'keyName', { prefix: 'hello/' } ]
      const len = config.length;
      if (len < 1 || len > 2) {
        console.warn('Invalid adapter configuration. When passing an array, it expects [ adapterType, options ]', config);
      } else {
        adapterType = config[0];
        opts = config[1]
      }
    } else if (typeof config === 'string') {
      adapterType = config;
      opts = {};
    }
    if (adapterType) {
      this.useAdapter(adapterType, opts);
    } else {
      console.warn('Ignoring invalid adapter configuration', config);
    }
  }


}