import {IDataStore} from "./storage-core";
import StorageRequestContext from "./storage-request-context";


const DelegatedMethods = [

]

interface ILocalforage {

}
var driverApiMethods = [
  'getItem',
  'setItem',
  'clear',
  'length',
  'removeItem',
  'key',
  'keys'
];

export default class LocalForageAdapterStore implements IDataStore {
  readonly store: object;

  constructor(localForageStore: object) {
    this.store = localForageStore;
  }

  async get(ctx: StorageRequestContext): Promise<any> {

  }

  async set(ctx: StorageRequestContext): Promise<any> {

  }


  isDataStore = true;
}