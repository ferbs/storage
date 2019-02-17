import NoopDecorator from "../../src/noop-decorator";
import StorageRequestContext from "../../src/storage-request-context";
import {NextLayer} from "../../src/storage-core";


export enum CharPlacement {
  Prefix = 'prefix',
  Suffix = 'suffix',
}

export class TestDecoratorForKeys extends NoopDecorator {
  placement: CharPlacement;
  chars: string; 
  
  constructor(placement: CharPlacement, chars: string) {
    super();
    this.placement = placement;
    this.chars = chars;
  }

  async get(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    const chars = this.chars;
    const isPrefix = this.placement === CharPlacement.Prefix;
    ctx.keysToGet = ctx.keysToGet.map(key => `${isPrefix ? chars : ''}${key}${ isPrefix ? '' : chars}`);
    await next();
  }
}

export enum StringTransform {
  Upcase = 'upcase',
  Downcase = 'downcase',
  Prepend = 'prepend',
  Append = 'append',
}

export class TestDecoratorForResultStrings extends NoopDecorator {
  changeType: StringTransform;
  chars: string | void;

  constructor(changeType: StringTransform, chars?: string) {
    super();
    this.changeType = changeType;
    this.chars = chars;
  }

  async get(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    await next();
    const changeType = this.changeType;
    const result = ctx.result;
    result && Object.keys(result).forEach(k => {
      const val = result[k];
      if (typeof val === 'string') {
        if (changeType === StringTransform.Upcase) {
          result[k] = val.toUpperCase();
        } else if (changeType === StringTransform.Downcase) {
          result[k] = val.toLowerCase();
        } else if (changeType === StringTransform.Prepend) {
          result[k] = `${this.chars || ''}${val}`;
        } else if (changeType === StringTransform.Append) {
        result[k] = `${val}${this.chars || ''}`;
        }
      }
    });
    ctx.result = result;
  }
}