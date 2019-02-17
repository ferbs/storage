import Storage, {IDataStore, IStorageDecorator, IGenericOpts} from "./storage-core";



const registeredStoreFactoryByType = <IStoreRegistry>{};
export type StoreFactoryFunction = (opts?: IGenericOpts) => IDataStore;
interface IStoreRegistry {
  [ key: string ]: StoreFactoryFunction;
}

const registeredDecoratorFactoryByType = <IDecoratorRegistry>{};
export type DecoratorFactoryFunction = (opts?: IGenericOpts) => IStorageDecorator;
interface IDecoratorRegistry {
  [ key: string ]: DecoratorFactoryFunction;
}

export function registerStore(storeType: string, storeFactory: StoreFactoryFunction) : void {
  registeredStoreFactoryByType[storeType] = storeFactory;
}

export function registerDecorator(decoratorType: string, decoratorFactory: DecoratorFactoryFunction) : void {
  registeredDecoratorFactoryByType[decoratorType] = decoratorFactory;
}

export function storeFactory(storageEngine: string | IDataStore, opts=<IGenericOpts>{}): IDataStore {
  if (!storageEngine) {
    throw new Error(`Storage store missing`);
  }
  let store;
  if (typeof storageEngine === 'string') {
    const factory = registeredStoreFactoryByType[storageEngine];
    if (!factory) {
      throw new Error(`Storage factory of type "${storageEngine}" not registered`);
    }
    store = factory(opts);
  } else {
    store = storageEngine;
  }
  if (!store) {
    console.error('Failed to create storage store', storageEngine, opts);
    throw new Error('Invalid storage store');
  }
  return store;
}

export function decoratorFactory(decoratorType: string | IStorageDecorator, opts=<IGenericOpts>{}): IStorageDecorator {
  if (!decoratorType) {
    throw new Error(`Storage decorator missing`);
  }
  let decorator;
  if (typeof decoratorType === 'string') {
    const factory = registeredDecoratorFactoryByType[decoratorType];
    if (!factory) {
      throw new Error(`Storage factory of type "${decoratorType}" not registered`);
    }
    decorator = factory(opts);
  } else {
    decorator = decoratorType;
  }
  if (!decorator || !decorator.isStorageDecorator) {
    console.error('Failed to create storage decorator', decoratorType, opts);
    throw new Error('Invalid storage decorator');
  }
  return decorator;
}


export function appendDecoratorsFromConfig(storage: Storage, config: any): void {
  if (Array.isArray(config)) {
    config.forEach(c => _appendDecoratorFromConfig(storage, c));
  } else {
    _appendDecoratorFromConfig(storage, config);
  }
}

function _appendDecoratorFromConfig(storage: Storage, config: any): void {
  if (!config) {
    return;
  }
  if (typeof config === 'object' && !Array.isArray(config)) {
    Object.keys(config).forEach(k => storage.useTransform(k, config[k]));
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
    storage.useTransform(decoratorType, opts);
  } else {
    console.warn('Ignoring invalid decorator configuration', config);
  }
}
