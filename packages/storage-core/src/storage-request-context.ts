import {DataMethod, IDataStore, IGenericOpts, IStorageDecorator, KeyValuePairs} from "./storage-core";
import middlewareTraverser from "./middleware-traverser";


export default class StorageRequestContext {
  readonly methodName!: DataMethod;
  readonly dataStore!: IDataStore;
  readonly transforms!: IStorageDecorator[];
  readonly storageConstructorOpts!: IGenericOpts;

  nodejsCallback?: (...args: any[]) => any;
  keysForGet?: string[]; // value is default when actual value not present, defaulting to undefined
  keysForRemove?: string[];
  keyValuePairsForSet?: KeyValuePairs;

  opts: IGenericOpts;
  error?: any;
  result?: any;
  isSoloGet?: boolean;


  constructor(userArgs: any[], contextData: Partial<StorageRequestContext>) {
    Object.assign(this, contextData); // methodName, dataStore, transforms, and storageConstructorOpts
    const rawArgs = userArgs.slice(0);
    if (typeof rawArgs[rawArgs.length - 1] === 'function') {
      this.nodejsCallback = rawArgs.pop();
    }
    const methodName = this.methodName;

    if (methodName === DataMethod.Get) {
      this.keysForGet = this._normalizeKeys(rawArgs);
    } else if (methodName === DataMethod.Set) {
      this.keyValuePairsForSet = this._normalizedKeyValuePairsForSet(rawArgs);
    } else if (methodName === DataMethod.Remove) {
      this.keysForRemove = this._normalizeKeys(rawArgs);
    }
    this.opts = Object.assign({}, contextData.opts,
      ...(rawArgs.map(arg => typeof arg === 'string' || typeof arg === 'number' ? { primary: arg } : arg)));
  }

  async makeTransformedRequest(): Promise<any> {
    return StorageRequestContext.transformedRequest(this);
  }

  async makeUpstreamRequest(afterDecorator: IStorageDecorator, methodName: DataMethod, ...methodArgs: any[]) {
    const ndx = this.transforms.findIndex(d => d === afterDecorator);
    if (ndx >= 0) {
      const { dataStore, storageConstructorOpts } = this;
      const transforms = this.transforms.slice(ndx + 1);
      const partialCtx = new StorageRequestContext(methodArgs, { methodName, dataStore, storageConstructorOpts, transforms });
      return partialCtx.makeTransformedRequest();
    } else {
      throw new Error('CurrentDecoratorNotFound');
    }
  }

  static async transformedRequest(ctx: StorageRequestContext): Promise<any> {
    const middlewareTransformer = middlewareTraverser(ctx.dataStore, ctx.transforms);
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
    if (!Array.isArray(raw) && typeof raw !== 'object') {
      this.isSoloGet = true;
    }
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