import Storage, {IDataStore, IStorageLayer, IGenericOpts} from "./storage-core";

enum Registry {
  Store = 'Store',
  Layer = 'Layer',
}
interface Registries {
  [Registry.Store]: IStoreRegistry;
  [Registry.Layer]: ILayerRegistry;
}
const Registries = <Registries>{
  [Registry.Store]: {},
  [Registry.Layer]: {},
};

type StoreType = string;
export type StoreFactoryFunction = (opts?: IGenericOpts) => IDataStore;
interface IStoreRegistry {
  [ key: string ]: StoreFactoryFunction;
}

type LayerType = string;
export type LayerFactoryFunction = (opts?: IGenericOpts) => IStorageLayer;
interface ILayerRegistry {
  [ key: string ]: LayerFactoryFunction;
}

export function registerStore(storeType: StoreType, storeFactory: StoreFactoryFunction) : void {
  Registries[Registry.Store][storeType] = storeFactory;
}

export function registerLayer(layerType: LayerType, layerFactory: LayerFactoryFunction) : void {
  Registries[Registry.Layer][layerType] = layerFactory;
}

export function getRegistries() {
  return Registries;
}

export function storeFactory(storageEngine: string | IDataStore, opts=<IGenericOpts>{}): IDataStore {
  if (!storageEngine) {
    throw new Error(`Storage store missing`);
  }
  let store;
  if (typeof storageEngine === 'string') {
    const factory = _getStoreFactoryFunction(storageEngine);
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

export function layerFactory(layerType: string | IStorageLayer, opts=<IGenericOpts>{}): IStorageLayer {
  if (!layerType) {
    throw new Error(`Storage layer missing`);
  }
  let layer;
  if (typeof layerType === 'string') {
    const factory = _getLayerFactoryFunction(layerType);
    if (!factory) {
      throw new Error(`Storage factory of type "${layerType}" not registered`);
    }
    layer = factory(opts);
  } else {
    layer = layerType;
  }
  if (!layer || !layer.isStorageLayer) {
    console.error('Failed to create storage layer', layerType, opts);
    throw new Error('Invalid storage layer');
  }
  return layer;
}


export function appendLayersFromConfig(storage: Storage, config: any): void {
  if (Array.isArray(config)) {
    config.forEach(c => _appendLayerFromConfig(storage, c));
  } else {
    _appendLayerFromConfig(storage, config);
  }
}

function _appendLayerFromConfig(storage: Storage, config: any): void {
  if (!config) {
    return;
  }
  if (typeof config === 'object' && !Array.isArray(config)) {
    Object.keys(config).forEach(k => storage.useTransform(k, config[k]));
    return;
  }
  let layerType, opts;
  if (Array.isArray(config)) { // case of a tuple, eg [ 'keyName', { prefix: 'hello/' } ]
    const len = config.length;
    if (len < 1 || len > 2) {
      console.warn('Invalid layer configuration. When passing an array, it expects [ layerType, options ]', config);
    } else {
      layerType = config[0];
      opts = config[1]
    }
  } else if (typeof config === 'string') {
    layerType = config;
    opts = {};
  }
  if (layerType) {
    storage.useTransform(layerType, opts);
  } else {
    console.warn('Ignoring invalid layer configuration', config);
  }
}

function _getStoreFactoryFunction(storeType: StoreType) {
  return Registries[Registry.Store][storeType];
}

function _getLayerFactoryFunction(layerType: LayerType) {
  return Registries[Registry.Layer][layerType];
}