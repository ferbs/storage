import {DataMethod, IGenericOpts, ItemKey, ItemKeys, KeyValuePairs} from "./storage-core";




export default class StorageRequestContext {
  readonly methodName: string;
  readonly storageConstructorOpts!: IGenericOpts;
  nodejsCallback?: (...args: any[]) => any;
  keysToGet?: string[]; // value is default when actual value not present, defaulting to undefined
  keyValuePairsToSet?: KeyValuePairs;
  opts: IGenericOpts;
  error?: any;
  result?: any;
  isSoloGet?: boolean;


  constructor(methodName: string, userArgs: any[], contextData: Partial<StorageRequestContext>) {
    this.methodName = methodName;
    if (typeof userArgs[userArgs.length - 1] === 'function') {
      this.nodejsCallback = userArgs.pop();
    }
    Object.assign(this, contextData);

    if (methodName === DataMethod.Get) {
      this._normalizeGetMethod(userArgs);
    } else if (methodName === DataMethod.Set) {
      this._normalizeSetMethod(userArgs);
    }
    this.opts = Object.assign({}, contextData.opts, ...(userArgs.map(arg => typeof arg === 'string' ? { primary: arg } : arg)));
  }

  useNodeJsCallback(): boolean {
    return !!this.nodejsCallback;
  }

  /**
   * Normalizes keys to a key-value pair object, where the value is desired default when item is not present, loosely following the
   * browser storage API.
   * @private
   * @param userArgs
   */
  private _normalizeGetMethod(userArgs: any[]): void {
    const raw = userArgs.shift();
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
    }
    this.keysToGet = keys;
  }

  private _normalizeSetMethod(userArgs: any[]): void {
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
      this.keyValuePairsToSet = keyValuePairs;
    } else {
      this.error = { errorCode: 'InvalidArgument', message: 'Expecting key-value pair object or string key' };
    }


  }
}