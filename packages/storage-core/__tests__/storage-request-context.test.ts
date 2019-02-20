const _ = require('lodash');
import {buildMemoryStore} from "./test-support/fixture-support";
import {TestFixtureArbitraryLayer, TestFixtureLayerPlacement} from "./test-support/layer-support";
import {DataMethod} from "../src/storage-core";
import StorageRequestContext from "../src/storage-request-context";


describe('@wranggle/storage-core/storage-request-context', () => {
  let store;

  const appendLayerForSet = beforeFn => store.useTransform(new TestFixtureArbitraryLayer([{
    method: DataMethod.Set,
    placement: TestFixtureLayerPlacement.Before,
    callback: beforeFn
  }]));

  describe('upstreamRequest', () => {
    beforeEach(() => {
      store = buildMemoryStore();
    });

    test("make independent storage requests with only subsequent layers applied", async () => {
      let callCount = 0;
      appendLayerForSet(async (ctx: StorageRequestContext) => {
        callCount += 1;
        ctx.keyValuePairsForSet = _.mapKeys(ctx.keyValuePairsForSet, (v, k) => k.toUpperCase());
      });
      appendLayerForSet((ctx: StorageRequestContext, layer: TestFixtureArbitraryLayer) => {
        callCount += 1;
        const backup = _.mapKeys(ctx.keyValuePairsForSet, (v, k) => `${k}.bak`);
        return layer.upstreamRequest(DataMethod.Set, backup);
      });
      appendLayerForSet(async (ctx: StorageRequestContext) => {
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
