import NoopLayer from "../../src/noop-layer";
import StorageRequestContext from "../../src/storage-request-context";
import {DataMethod, NextLayer} from "../../src/storage-core";
const _ = require('lodash');


export enum CharPlacement {
  Prefix = 'prefix',
  Suffix = 'suffix',
}

export class TestLayerForKeys extends NoopLayer {
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

export enum ChangeTypeForTestLayer {
  Upcase = 'upcase',
  Downcase = 'downcase',
  Prepend = 'prepend',
  Append = 'append',
}

export class TestLayerForGetResultStrings extends NoopLayer {
  changeType: ChangeTypeForTestLayer;
  chars: string | void;

  constructor(changeType: ChangeTypeForTestLayer, chars?: string) {
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
        if (changeType === ChangeTypeForTestLayer.Upcase) {
          result[k] = val.toUpperCase();
        } else if (changeType === ChangeTypeForTestLayer.Downcase) {
          result[k] = val.toLowerCase();
        } else if (changeType === ChangeTypeForTestLayer.Prepend) {
          result[k] = `${this.chars || ''}${val}`;
        } else if (changeType === ChangeTypeForTestLayer.Append) {
        result[k] = `${val}${this.chars || ''}`;
        }
      }
    });
    ctx.result = result;
  }
}

export enum TestFixtureLayerPlacement {
  Before, After
}
export interface ITestFixtureArbitraryLayerConfig {
  method: DataMethod;
  placement: TestFixtureLayerPlacement;
  callback: (ctx: StorageRequestContext, layer: TestFixtureArbitraryLayer) => void;
}
  export class TestFixtureArbitraryLayer extends NoopLayer {
  private readonly activitiesByMethod = {};
  upstreamRequest!: (methodName: DataMethod, ...methodArgs: any[]) => Promise<any>;

  constructor(activities?: ITestFixtureArbitraryLayerConfig | ITestFixtureArbitraryLayerConfig[]) {
    super();
    activities = Array.isArray(activities) ? activities : activities ? [ activities ] : [];
    this.activitiesByMethod = _.groupBy(activities, 'method');
  }
  addActivity(activity: ITestFixtureArbitraryLayerConfig) {
    this.activitiesByMethod[activity.method] = this.activitiesByMethod[activity.method] || [];
    this.activitiesByMethod[activity.method].push(activity);
  }
}
Object.values(DataMethod).forEach(methodName => {
  TestFixtureArbitraryLayer.prototype[methodName] = async function(ctx: StorageRequestContext, next: NextLayer): Promise<any> {
    const methods = this.activitiesByMethod[methodName] || [];
    const callbackBefore = (methods.find(methodDef => methodDef.placement === TestFixtureLayerPlacement.Before) || {}).callback;
    const callbackAfter = (methods.find(methodDef => methodDef.placement === TestFixtureLayerPlacement.After) || {}).callback;
    if (_.isFunction(callbackBefore)) {
      await callbackBefore(ctx, this);
    }
    await next();
    if (_.isFunction(callbackAfter)) {
      await callbackAfter(ctx, this);
    }
  }
});
 