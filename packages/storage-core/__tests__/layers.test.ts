import {CharPlacement, ChangeTypeForTestLayer, TestLayerForKeys, TestLayerForGetResultStrings, TestFixtureArbitraryLayer, TestFixtureLayerPlacement} from "./test-support/layer-support";
import {buildMemoryStore} from "./test-support/fixture-support";
import {DataMethod} from "../src/storage-core";


describe('@wranggle/storage-core/layers', () => {
  let store;
  const initialContent = { moo: 'Cow', meow: 'Cat' };

  describe('modify keys requested', () => {
    beforeEach(() => {
      store = buildMemoryStore(initialContent);
    });

    test('before-phase layers are applied', async () => {
      store.useTransform(new TestLayerForKeys(CharPlacement.Prefix, 'm'));
      const val = await store.get('oo');
      expect(val).toBe('Cow');
    });

    test('transform applied to keys in order added, oldest first, middleware-style', async () => {
      store.useTransform(new TestLayerForKeys(CharPlacement.Suffix, 'o'));
      store.useTransform(new TestLayerForKeys(CharPlacement.Suffix, 'w'));
      const val = await store.get('me');
      expect(val).toBe('Cat');
    });
  });

  describe('modify returned results', () => {
    beforeEach(() => {
      store = buildMemoryStore(initialContent);
    });

    test('after-phase layers are applied', async () => {
      store.useTransform(new TestLayerForGetResultStrings(ChangeTypeForTestLayer.Prepend, 'Big_'));
      const val = await store.get('moo');
      expect(val).toBe('Big_Cow');
    });

    test('layers are applied to result in reverse of order added, newest first, middleware-style', async () => {
      store.useTransform(new TestLayerForGetResultStrings(ChangeTypeForTestLayer.Upcase));
      store.useTransform(new TestLayerForGetResultStrings(ChangeTypeForTestLayer.Downcase));
      const val = await store.get('meow');
      expect(val).toBe('CAT');
    });
  });

  describe('error in layer', () => {
    let callCount;

    const buildCallCountLayer = (placement: TestFixtureLayerPlacement) => new TestFixtureArbitraryLayer({
      method: DataMethod.Get,
      placement,
      callback: (ctx, layer) => (callCount += 1),
    });
    const buildStoreWithError = (placement: TestFixtureLayerPlacement) => {
      store = buildMemoryStore(initialContent);
      store.useTransform(buildCallCountLayer(placement));
      store.useTransform(new TestFixtureArbitraryLayer({
        method: DataMethod.Get,
        placement,
        callback: (ctx, layer) => ctx.error = 'Kaboom',
      }));
      store.useTransform(buildCallCountLayer(placement));
    };

    beforeEach(() => {
      callCount = 0;
    });

    test('stop traversing request when error applied', async () => {
      buildStoreWithError(TestFixtureLayerPlacement.Before);
      let error, result;
      await store.set('aa', 11);
      try {
        result = await store.get('aa');
      } catch (err) {
        error = err;
      }
      expect(error).toBe('Kaboom');
      expect(callCount).toBe(1);
      expect(result).toBeUndefined();
    });


    test('permit response phase to execute when error present', async () => {
      buildStoreWithError(TestFixtureLayerPlacement.After);
      store.layers.unshift(new TestFixtureArbitraryLayer({
        method: DataMethod.Get,
        placement: TestFixtureLayerPlacement.After,
        callback: (ctx, layer) => {
          if (ctx.error === 'Kaboom') {
            ctx.result = 'MyDefaultValue';
            ctx.error = false;
          }
        },
      }));
      let error, result;
      await store.set('aa', 'zz');
      try {
        result = await store.get('aa');
      } catch (err) {
        error = err;
      }
      expect(error).toBeFalsy();
      expect(callCount).toBe(2);
      expect(result).toBe('MyDefaultValue');
    });
  });


// todo: able to add, remove, and reorder layers even after being used. And test store.insertTransformAt
});
