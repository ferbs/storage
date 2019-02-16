import {IDataStore, IStorageDecorator, IGenericOpts} from "./storage-core";

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

export function storeFactory(storeType: string | IDataStore, opts=<IGenericOpts>{}): IDataStore {
  if (!storeType) {
    throw new Error(`Storage store missing`);
  }
  let store;
  if (typeof storeType === 'string') {
    const factory = registeredStoreFactoryByType[storeType];
    if (!factory) {
      throw new Error(`Storage factory of type "${storeType}" not registered`);
    }
    store = factory(opts);
  } else {
    store = storeType;
  }
  if (!store) {
    console.error('Failed to create storage store', storeType, opts);
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
