import {IDataStore, IStorageAdapter, IGenericOpts} from "./storage-core";

const registeredStoreFactoryByType = <IStoreRegistry>{};
export type StoreFactoryFunction = (opts?: IGenericOpts) => IDataStore;
interface IStoreRegistry {
  [ key: string ]: StoreFactoryFunction;
}

const registeredAdapterFactoryByType = <IAdapterRegistry>{};
export type AdapterFactoryFunction = (opts?: IGenericOpts) => IStorageAdapter;
interface IAdapterRegistry {
  [ key: string ]: AdapterFactoryFunction;
}

export function registerStore(storeType: string, storeFactory: StoreFactoryFunction) : void {
  registeredStoreFactoryByType[storeType] = storeFactory;
}

export function registerAdapter(adapterType: string, adapterFactory: AdapterFactoryFunction) : void {
  registeredAdapterFactoryByType[adapterType] = adapterFactory;
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

export function adapterFactory(adapterType: string | IStorageAdapter, opts=<IGenericOpts>{}): IStorageAdapter {
  if (!adapterType) {
    throw new Error(`Storage adapter missing`);
  }
  let adapter;
  if (typeof adapterType === 'string') {
    const factory = registeredAdapterFactoryByType[adapterType];
    if (!factory) {
      throw new Error(`Storage factory of type "${adapterType}" not registered`);
    }
    adapter = factory(opts);
  } else {
    adapter = adapterType;
  }
  if (!adapter || !adapter.isStorageAdapter) {
    console.error('Failed to create storage adapter', adapterType, opts);
    throw new Error('Invalid storage adapter');
  }
  return adapter;
}
