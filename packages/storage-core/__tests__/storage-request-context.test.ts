const _ = require('lodash');
import {buildMemoryStore} from "./test-support/fixture-support";
import {TestFixtureArbitraryDecorator, TestFixtureDecoratorPlacement} from "./test-support/decorator-support";
import {DataMethod} from "../src/storage-core";
import StorageRequestContext from "../src/storage-request-context";


describe('@wranggle/storage-core/storage-request-context', () => {
  let store;

  const appendDecoratorForSet = beforeFn => store.useTransform(new TestFixtureArbitraryDecorator([{
    method: DataMethod.Set,
    placement: TestFixtureDecoratorPlacement.Before,
    callback: beforeFn
  }]));

  describe('upstreamRequest', () => {
    beforeEach(() => {
      store = buildMemoryStore();
    });

    test("make independent storage requests with only subsequent decorators applied", async () => {
      let callCount = 0;
      appendDecoratorForSet(async (ctx: StorageRequestContext) => {
        callCount += 1;
        ctx.keyValuePairsForSet = _.mapKeys(ctx.keyValuePairsForSet, (v, k) => k.toUpperCase());
      });
      appendDecoratorForSet((ctx: StorageRequestContext, decorator: TestFixtureArbitraryDecorator) => {
        callCount += 1;
        const backup = _.mapKeys(ctx.keyValuePairsForSet, (v, k) => `${k}.bak`);
        return decorator.upstreamRequest(DataMethod.Set, backup);
      });
      appendDecoratorForSet(async (ctx: StorageRequestContext) => {
        callCount += 1;
        ctx.keyValuePairsForSet = _.mapKeys(ctx.keyValuePairsForSet, (v, k) => `k:${k}`);
      });

      await store.set({
        Aa: 11,
        Bb: 22
      });
      const data = await store.snapshot();
      expect(data).toEqual({
        'k:AA': 11,
        'k:BB': 22,
        'k:AA.bak': 11,
        'k:BB.bak': 22,
      });
      expect(callCount).toBe(4);
    });
    
  });
});
