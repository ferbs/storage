import {DataMethod, IDataStore, IGenericOpts, IStorageLayer, KeyValuePairs} from "./storage-core";
import middlewareTraverser from "./middleware-traverser";


const PrimaryOptionAttribName = 'primary';


export default class StorageRequestContext {
  readonly methodName!: DataMethod;
  readonly backingStore!: IDataStore;
  readonly layers!: IStorageLayer[];
  readonly storageConstructorOpts!: IGenericOpts;

  nodejsCallback?: (...args: any[]) => any;
  keysForGet?: string[]; // value is default when actual value not present, defaulting to undefined
  keysForRemove?: string[];
  keyValuePairsForSet?: KeyValuePairs;

  opts: IGenericOpts;
  error?: any;
  result?: any;


  constructor(contextData: Partial<StorageRequestContext>, ...userArgs: any[]) {
    Object.assign(this, contextData); // methodName, backingStore, layers, and storageConstructorOpts
    if (typeof userArgs[userArgs.length - 1] === 'function') { // todo: or throw an error? can expect/require promise-based args at this point, relying on main StorageCore facade to universalify it
      this.nodejsCallback = userArgs.pop();
    }
    const methodName = this.methodName;
    if (methodName === DataMethod.Get) {
      this.keysForGet = this._normalizeKeys(userArgs);
    } else if (methodName === DataMethod.Set) {
      this.keyValuePairsForSet = this._normalizedKeyValuePairsForSet(userArgs);
    } else if (methodName === DataMethod.Remove) {
      this.keysForRemove = this._normalizeKeys(userArgs);
    }
    this.opts = Object.assign({}, contextData.opts,
      ...(userArgs.map(arg => typeof arg === 'string' || typeof arg === 'number' ? { [ PrimaryOptionAttribName]: arg } : arg)));
  }

  makeTransformedRequest(): Promise<any> {
    return StorageRequestContext.transformedRequest(this);
  }
  

  static async transformedRequest(ctx: StorageRequestContext): Promise<any> {
    const middlewareTransformer = middlewareTraverser(ctx.backingStore, ctx.layers);
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

  useNodeJsCallback(): boolean {
    return !!this.nodejsCallback;
  }

  /**
   * Normalizes keys to a key-value pair object, where the value is desired default when item is not present, loosely following the
   * browser storage API.
   * @private
   * @param args
   */
  private _normalizeKeys(args: any[]): string[] {
    const raw = args.shift();
    let keys;
    if (Array.isArray(raw)) {
      keys = raw;
    } else if (typeof raw === 'object') { // todo: what to do with values in this case? Is key-defualt expected/needed?
      keys = Object.keys(raw);
    } else if (raw) {
      keys = typeof raw === 'string' ? [ raw ] : [ raw.toString() ];
    } else {
      this.error = { errorCode: 'ItemKeyRequired' };
      keys = [];
    }
    return keys;
  }

  private _normalizedKeyValuePairsForSet(userArgs: any[]): KeyValuePairs {
    let keyValuePairs;
    const arg0 = userArgs.shift();
    if (typeof arg0 === 'object' && !Array.isArray(arg0)) {
      keyValuePairs = arg0;
    } else if (typeof arg0 === 'string') {
      keyValuePairs = {
        [ arg0 ]: userArgs.shift()
      };
    }
    if (keyValuePairs) {
      return keyValuePairs;
    } else {
      this.error = { errorCode: 'InvalidArgument', message: 'Expecting key-value pair object or string key' };
      return {};
    }
  }
}