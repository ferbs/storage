import {registerStore, registerDecorator, decoratorFactory, StoreFactoryFunction, DecoratorFactoryFunction, storeFactory,} from './serialized-config';
import NormalizeArgsDecorator from "./normalize-args-decorator";
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

export interface IStorageDecorator extends IDataStoreLayer {
  isStorageDecorator: boolean;
}

export interface IDataStore extends IDataStoreLayer {
}

export interface IStorageOpts {
  transforms?: Array<string | IStorageDecorator>;
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
  transforms: IStorageDecorator[];
  _middlewareTransformer = <ComposedMiddleware | null> null;

  constructor(dataStore: IDataStore | string, opts=<IStorageOpts>{}) {
    this.dataStore = storeFactory(dataStore, opts);
    this.transforms = [ new NormalizeArgsDecorator(opts) ]
    this.useTransforms(opts.transforms);
  }

  static registerStoreFactory(engineType: string, engineFactory: StoreFactoryFunction): void {
    registerStore(engineType, engineFactory);
  }

  static registerDecoratorFactory(engineType: string, engineFactory: DecoratorFactoryFunction): void {
    registerDecorator(engineType, engineFactory);
  }

  async get(keys: GetParam, ...extraArgs: any): Promise<any> {
    const ctx = this._createContext('get', { keys }, extraArgs);
    return this._makeTransformedRequest(ctx);
  }

  useTransform(decoratorType: string, opts?: IGenericOpts) {
    this.transforms.push(decoratorFactory(decoratorType, opts));
    this._middlewareTransformer = null;
  }

  useTransforms(configs: any): void {
    if (Array.isArray(configs)) {
      configs.forEach(c => this._appendDecoratorFromConfig(c));
    } else {
      this._appendDecoratorFromConfig(configs);
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
      this._middlewareTransformer = middlewareTraverser(this.dataStore, this.transforms);
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


  _appendDecoratorFromConfig(config: any): void {
    if (!config) {
      return;
    }
    if (typeof config === 'object' && !Array.isArray(config)) {
      Object.keys(config).forEach(k => this.useTransform(k, config[k]));
      return;
    }
    let decoratorType, opts;
    if (Array.isArray(config)) { // case of a tuple, eg [ 'keyName', { prefix: 'hello/' } ]
      const len = config.length;
      if (len < 1 || len > 2) {
        console.warn('Invalid decorator configuration. When passing an array, it expects [ decoratorType, options ]', config);
      } else {
        decoratorType = config[0];
        opts = config[1]
      }
    } else if (typeof config === 'string') {
      decoratorType = config;
      opts = {};
    }
    if (decoratorType) {
      this.useTransform(decoratorType, opts);
    } else {
      console.warn('Ignoring invalid decorator configuration', config);
    }
  }


}