import StorageRequestContext from "@wranggle/storage-core/src/storage-request-context";
import {DataMethod, IStorageDecorator, KeyValuePairs, NextLayer } from "@wranggle/storage-core/src/storage-core";
import {startsWith, endsWith, isString} from "@wranggle/storage-core/src/util/string-util";


export interface IKeyNameDecoratorOpts {
  /**
   * When present, this string will be prepended to all keys
   */
  prefix?: string;

  /**
   * When present, this string will be appended to end of each key
   */
  suffix?: string;

  /**
   * Shortcut for setting prefix. It uses the passed in `bucket` value plus the `bucketDelimeter`.
   * Eg, "myBucket" becomes `prefix` "myBucket/"
   */
  bucket?: string;

  /**
   * When bucket option is used, this value is added when setting the prefix.
   * default "/"
   */
  bucketDelimeter?: string;

  /**
   * Not to be used directly. When serialized construction is used, if a string primitive is present it gets set as the
   * "primary" option, which this decorator interprets as an alias for `bucket`.
   */
  primary?: string; 
}

const DefaultOpts = <IKeyNameDecoratorOpts>{
  bucketDelimeter: '/',
};


type UserKey = string;
type TransformedKey = string;


export default class KeyNameDecorator implements IStorageDecorator {
  private opts: IKeyNameDecoratorOpts;

  upstreamRequest!: (methodName: DataMethod, ...methodArgs: any[]) => Promise<any>;

  constructor(opts?: Partial<IKeyNameDecoratorOpts>) {
    opts = Object.assign({}, DefaultOpts, opts);
    if (!opts.bucket && typeof opts.primary === 'string') {
      opts.bucket = opts.primary;
    }
    if (isString(opts.bucket)) {
      opts.prefix = `${isString(opts.prefix) ? opts.prefix : ''}${opts.bucket}${opts.bucketDelimeter}`;
    }
    if (!isString(opts.prefix) && !isString(opts.suffix)) {
      throw new Error('KeyNameDecorator requires prefix/bucket or suffix');
    }
    opts.prefix = opts.prefix || '';
    opts.suffix = opts.suffix || '';
    this.opts = opts as IKeyNameDecoratorOpts;
  }

  async get(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    ctx.keysForGet = this._convertUserKeysToTransformedKeys(ctx.keysForGet || []);
    await next();

    const rawData = ctx.result || {};
    const resultByUserKey = <KeyValuePairs>{};
    Object.keys(rawData).forEach(transformedKey => {
      resultByUserKey[this._parseUserKeyFromTransformedKey(transformedKey)] = rawData[transformedKey];
    });
    ctx.result = resultByUserKey;
  }

  async keys(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    await next();
    const prefix = this.opts.prefix as string;
    const suffix = this.opts.suffix as string;
    const result = [] as UserKey[];
    (ctx.result || []).forEach((transformed: TransformedKey) => {
      if (this._isMatchingKey(transformed, prefix, suffix)) {
        result.push(this._parseUserKeyFromTransformedKey(transformed));
      }
    });
    ctx.result = result;
  }

  async remove(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    ctx.keysForRemove = this._convertUserKeysToTransformedKeys(ctx.keysForRemove || []);
    await next();
  }

  async set(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    const rawData = ctx.keyValuePairsForSet || {};
    const transformedData = <KeyValuePairs>{};
    Object.keys(rawData).forEach((userKey: UserKey) => {
      transformedData[this._convertUserKeyToTransformedKey(userKey)] = rawData[userKey];
    });
    ctx.keyValuePairsForSet = transformedData;
    await next();
  }

  async snapshot(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    await next();
    const rawData = ctx.result || {};
    const result = <KeyValuePairs>{};
    const prefix = this.opts.prefix as string;
    const suffix = this.opts.suffix as string;
    Object.keys(ctx.result || {}).forEach((transformed: TransformedKey) => {
      if (this._isMatchingKey(transformed, prefix, suffix)) {
        result[this._parseUserKeyFromTransformedKey(transformed)] = rawData[transformed];
      }
    });
    ctx.result = result;
  }


  get isStorageDecorator(): boolean {
    return true;
  }

  private _convertUserKeyToTransformedKey(userKey: UserKey): TransformedKey {
    return `${this.opts.prefix}${userKey}${this.opts.suffix}`;
  }

  private _convertUserKeysToTransformedKeys(userKeys: UserKey[]): TransformedKey[] {
    const prefix = this.opts.prefix;
    const suffix = this.opts.suffix;
    return userKeys.map(userKey => `${prefix}${userKey}${suffix}`);
  }

  private _parseUserKeyFromTransformedKey(transformed: TransformedKey): UserKey {
    const prefix = this.opts.prefix as string;
    const suffix = this.opts.suffix as string;
    let result = transformed.slice(0, transformed.length - suffix.length);
    result = result.slice(prefix.length);
    return result;
  }

  private _isMatchingKey(key: TransformedKey, prefix: string, suffix: string): boolean {
    return (!prefix || startsWith(key, prefix)) && (!suffix || endsWith(key, suffix));
  }

}