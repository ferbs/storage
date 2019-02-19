import NoopDecorator from "../../src/noop-decorator";
import StorageRequestContext from "../../src/storage-request-context";
import {DataMethod, NextLayer} from "../../src/storage-core";
const _ = require('lodash');


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
    ctx.keysForGet = ctx.keysForGet.map(key => `${isPrefix ? chars : ''}${key}${ isPrefix ? '' : chars}`);
    await next();
  }
}

export enum ChangeTypeForTestDecorator {
  Upcase = 'upcase',
  Downcase = 'downcase',
  Prepend = 'prepend',
  Append = 'append',
}

export class TestDecoratorForGetResultStrings extends NoopDecorator {
  changeType: ChangeTypeForTestDecorator;
  chars: string | void;

  constructor(changeType: ChangeTypeForTestDecorator, chars?: string) {
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
        if (changeType === ChangeTypeForTestDecorator.Upcase) {
          result[k] = val.toUpperCase();
        } else if (changeType === ChangeTypeForTestDecorator.Downcase) {
          result[k] = val.toLowerCase();
        } else if (changeType === ChangeTypeForTestDecorator.Prepend) {
          result[k] = `${this.chars || ''}${val}`;
        } else if (changeType === ChangeTypeForTestDecorator.Append) {
        result[k] = `${val}${this.chars || ''}`;
        }
      }
    });
    ctx.result = result;
  }
}

export enum TestFixtureDecoratorPlacement {
  Before, After
}
export interface ITestFixtureArbitraryDecoratorConfig {
  method: DataMethod;
  placement: TestFixtureDecoratorPlacement;
  callback: (ctx: StorageRequestContext, decorator: TestFixtureArbitraryDecorator) => void;
}
  export class TestFixtureArbitraryDecorator extends NoopDecorator {
  private readonly activitiesByMethod = {};
  upstreamRequest!: (methodName: DataMethod, ...methodArgs: any[]) => Promise<any>;

  constructor(activities?: ITestFixtureArbitraryDecoratorConfig | ITestFixtureArbitraryDecoratorConfig[]) {
    super();
    activities = Array.isArray(activities) ? activities : activities ? [ activities ] : [];
    this.activitiesByMethod = _.groupBy(activities, 'method');
  }
  addActivity(activity: ITestFixtureArbitraryDecoratorConfig) {
    this.activitiesByMethod[activity.method] = this.activitiesByMethod[activity.method] || [];
    this.activitiesByMethod[activity.method].push(activity);
  }
}
Object.values(DataMethod).forEach(methodName => {
  TestFixtureArbitraryDecorator.prototype[methodName] = async function(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    const methods = this.activitiesByMethod[methodName] || [];
    const callbackBefore = (methods.find(methodDef => methodDef.placement === TestFixtureDecoratorPlacement.Before) || {}).callback;
    const callbackAfter = (methods.find(methodDef => methodDef.placement === TestFixtureDecoratorPlacement.After) || {}).callback;
    if (_.isFunction(callbackBefore)) {
      await callbackBefore(ctx, this);
    }
    await next();
    if (_.isFunction(callbackAfter)) {
      await callbackAfter(ctx, this);
    }
  }
});
 