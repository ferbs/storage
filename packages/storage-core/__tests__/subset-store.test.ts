import Storage from '../src/storage-core';
import {buildMemoryStore} from "./test-support/fixture-support";
import {ChangeTypeForTestLayer, TestLayerForGetResultStrings  } from "./test-support/layer-support";

describe('@wranggle/storage-core', () => {
  describe('subset-store', () => {
    let store_1, store_2, shared;

    beforeEach(() => {
      shared = buildMemoryStore();
      store_1 = shared.createSubsetStore();
      store_1.useTransform(new TestLayerForGetResultStrings(ChangeTypeForTestLayer.Upcase));
      store_2 = new Storage(shared);
      store_2.useTransform(new TestLayerForGetResultStrings(ChangeTypeForTestLayer.Downcase));
    });

    test('transform on subset store applied to it but not applied to other stores', async () => {
      await shared.set('aa', 'Aa');
      expect(await shared.get('aa')).toBe('Aa');
      const val_1 = await store_1.get('aa');
      const val_2 = await store_2.get('aa');
      expect(val_1).toBe('AA');
      expect(val_2).toBe('aa');
      expect(val_1).not.toBe(val_2);
    });

  });

  // see also tests in KeyNameLayer
});