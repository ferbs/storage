import StorageRequestContext from "@wranggle/storage-core/src/storage-request-context";
import {DataMethod, IStorageDecorator, KeyValuePairs, NextLayer } from "@wranggle/storage-core/src/storage-core";
import {endsWith} from "@wranggle/storage-core/src/util/string-util";


const Minute = 1000 * 60;


const DefaultOpts = <IExpirationDecoratorOpts>{
  polling: Minute * 1.4,
  expirationKeySuffix: ':exp_',
  valueKeySuffix: ':val_',
  duration: Minute * 30  // uses "primary" option if duration not present
};

export interface IExpirationDecoratorOpts {
  polling: number | boolean;
  expirationKeySuffix: string;
  valueKeySuffix: string;
  duration: number;
  primary?: number
} 

type UserKey = string;
type TransformedKey = string;


export default class ExpirationDecorator implements IStorageDecorator {
  private opts: IExpirationDecoratorOpts;
  private _stopped = false;
  private _expiredItemsLastDeletedAt = 0;
  upstreamRequest!: (methodName: DataMethod, ...methodArgs: any[]) => Promise<any>;

  constructor(opts?: Partial<IExpirationDecoratorOpts>) {
    opts = Object.assign({}, DefaultOpts, opts);
    if (typeof opts.primary === 'number') {
      opts.duration = opts.primary;
    }
    if (opts.polling === true) {
      opts.polling = DefaultOpts.polling;
    }
    this.opts = opts as IExpirationDecoratorOpts;
    this._initExpirationPolling();
  }

  async get(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    ctx.keysForGet = this._convertUserKeysToTransformedKeys(ctx.keysForGet || []);
    await next();

    const rawData = ctx.result || {};
    const resultByUserKey = <KeyValuePairs>{};

    const expiredUserKeys = <UserKey[]>[];
    const now = Date.now();

    const expSuffix = this._expSuffix();
    Object.keys(rawData).forEach(transformedKey => {
      const val = rawData[transformedKey];
      const userKey = this._parseUserKeyFromTransformedKey(transformedKey, expSuffix);
      if (this._isValueKey(transformedKey)) {
        resultByUserKey[userKey] = val;
      } else if (typeof val !== 'number' || val < now) {
        expiredUserKeys.push(userKey);
      }
    });
    if (expiredUserKeys.length) {
      expiredUserKeys.forEach(userKey => delete resultByUserKey[userKey]);
      await this._removeUpstreamExpiredItems(expiredUserKeys);
    }
    ctx.result = resultByUserKey;
  }

  async keys(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    await this._clearExpiredItems();
    await next();
    const result = <UserKey[]>[];
    const valSuffix = this._valSuffix();
    (ctx.result || []).forEach((k: TransformedKey) => {
      if (this._isValueKey(k)) {
        result.push(this._parseUserKeyFromTransformedKey(k, valSuffix));
      }
    });
    ctx.result = result;
  }

  async remove(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    ctx.keysForRemove = this._convertUserKeysToTransformedKeys(ctx.keysForRemove || []);
    await next();
  }

  async set(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    const durationOverride = ctx.opts.duration || ctx.opts.primary;
    const duration = typeof durationOverride  === 'number' && durationOverride > 0 ? durationOverride : this.opts.duration;
    const raw = ctx.keyValuePairsForSet || {};
    const transformed = <KeyValuePairs>{};
    const expire = Date.now() + duration;
    Object.keys(raw).forEach(userKey => {
      transformed[this._valueKey(userKey)] = raw[userKey];
      transformed[this._expirationKey(userKey)] = expire;
    });
    ctx.keyValuePairsForSet = transformed;
    await next();
  }

  async snapshot(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    await this._clearExpiredItems(); // todo: perhaps filter expired items after retrieved?
    await next();
    const result = <KeyValuePairs>{};
    const valSuffix = this._valSuffix();
    const data = ctx.result;
    Object.keys(data || {}).forEach((k: TransformedKey) => {
      if (this._isValueKey(k)) {
        result[this._parseUserKeyFromTransformedKey(k, valSuffix)] = data[k];
      }
    });
    ctx.result = result;
  }

  stop() {
    this._stopped = true;
  }
  
  async touchExpiration(desiredKeys?: UserKey[] | null, duration?: number) {
    if (typeof desiredKeys === 'number') {
      duration = desiredKeys;
      desiredKeys = null;
    }
    if (typeof duration !== 'number') {
      duration = this.opts.duration;
    }


    const existingKeys = await this.upstreamRequest(DataMethod.Keys);
    let keysToTouch = <TransformedKey[]>[];
    if (desiredKeys) {
      const permitted = new Set(existingKeys);
      desiredKeys.forEach((k: UserKey) => {
        const expKey = this._expirationKey(k);
        if (permitted.has(expKey)) {
          keysToTouch.push(expKey);
        }
      });
    } else {
      keysToTouch = existingKeys.filter((k: TransformedKey) => this._isExpirationKey(k));
    }
    const exp = Date.now() + duration;
    const data = <KeyValuePairs>{};
    keysToTouch.forEach(k => {
      data[k] = exp;
    });
    return this.upstreamRequest(DataMethod.Set, keysToTouch);
  }


  get isStorageDecorator(): boolean {
    return true;
  }

  private _isExpirationKey(key: TransformedKey) {
    return endsWith(key, this.opts.expirationKeySuffix);
  }

  private _isValueKey(key: TransformedKey): boolean {
    return endsWith(key, this.opts.valueKeySuffix);
  }

  private _valueKey(userKey: UserKey): TransformedKey {
    return `${userKey}${this._valSuffix()}`;
  }

  private _expirationKey(userKey: UserKey): TransformedKey {
    return `${userKey}${this._expSuffix()}`;
  }

  private _expSuffix() {
    return this.opts.expirationKeySuffix;
  }

  private _valSuffix() {
    return this.opts.valueKeySuffix;
  }

  private _parseUserKeyFromTransformedKey(transformed: TransformedKey, suffix: string): UserKey {
    return transformed.slice(0, transformed.length - suffix.length);
  }

  private _convertUserKeysToTransformedKeys(userKeys: UserKey[]) {
    const res = [] as TransformedKey[];
    userKeys.forEach(userKey => {
      res.push(this._valueKey(userKey));
      res.push(this._expirationKey(userKey));
    });
    return res;
  }

  private _removeUpstreamExpiredItems(userKeysToRemove: UserKey[]): Promise<any> {
    return this.upstreamRequest(DataMethod.Remove,
      this._convertUserKeysToTransformedKeys(userKeysToRemove));
  }

  private async _clearExpiredItems(): Promise<any> {
    // todo: enforce this._stopped here (but only if also enforced in all methods, to avoid bad results when fetching expired items after stop.)
    const now = Date.now();
    this._expiredItemsLastDeletedAt = now;  // used for postponing/skipping background polling should it see it had been recently cleared
    const rawKeys = await this.upstreamRequest(DataMethod.Keys);
    const expirationKeys = rawKeys.filter(this._isExpirationKey.bind(this));
    const expirationData = await this.upstreamRequest(DataMethod.Get, expirationKeys);
    const expiredUserKeys = <UserKey[]>[];
    const expSuffix =  this._expSuffix();
    Object.keys(expirationData).forEach((expKey: TransformedKey) => { // todo: refactor some of this with `get`
      const expiration = expirationData[expKey];
      if (typeof expiration !== 'number' || expiration < now) {
        expiredUserKeys.push(this._parseUserKeyFromTransformedKey(expKey, expSuffix));
      }
    });
    if (expiredUserKeys.length) {
      await this._removeUpstreamExpiredItems(expiredUserKeys);
    }
  }

  _initExpirationPolling() {
    const itself = this;
    const polling = this.opts.polling;
    if (typeof polling !== 'number' || polling <= 0) {
      return;
    }
    const expirationCheck = () => {
      if (itself._stopped) {
        return;
      }
      const timeSinceLastCheck = Date.now() - itself._expiredItemsLastDeletedAt;
      if (timeSinceLastCheck < polling) {
        _schedule(itself._expiredItemsLastDeletedAt + polling);
      } else {
        itself._clearExpiredItems().then(() => _schedule(polling));
      }
    };
    function _schedule(ms: number) {
      setTimeout(expirationCheck, ms);
    }
    _schedule(polling);
  }

}