import {CharPlacement, StringTransform, TestDecoratorForKeys, TestDecoratorForResultStrings, TestFixtureArbitraryDecorator, TestFixtureDecoratorPlacement} from "./test-support/decorator-support";
import {buildMemoryStore} from "./test-support/fixture-support";
import {DataMethod} from "../src/storage-core";


describe('@wranggle/storage-core/decorators', () => {
  let store;
  const initialContent = { moo: 'Cow', meow: 'Cat' };

  describe('modify keys requested', () => {
    beforeEach(() => {
      store = buildMemoryStore(initialContent);
    });

    test('before-phase transforms are applied', async () => {
      store.useTransform(new TestDecoratorForKeys(CharPlacement.Prefix, 'm'));
      const val = await store.get('oo');
      expect(val).toBe('Cow');
    });

    test('transform applied to keys in order added, oldest first, middleware-style', async () => {
      store.useTransform(new TestDecoratorForKeys(CharPlacement.Suffix, 'o'));
      store.useTransform(new TestDecoratorForKeys(CharPlacement.Suffix, 'w'));
      const val = await store.get('me');
      expect(val).toBe('Cat');
    });
  });

  describe('modify returned results', () => {
    beforeEach(() => {
      store = buildMemoryStore(initialContent);
    });

    test('after-phase transforms are applied', async () => {
      store.useTransform(new TestDecoratorForResultStrings(StringTransform.Prepend, 'Big_'));
      const val = await store.get('moo');
      expect(val).toBe('Big_Cow');
    });

    test('transforms are applied to result in reverse of order added, newest first, middleware-style', async () => {
      store.useTransform(new TestDecoratorForResultStrings(StringTransform.Upcase));
      store.useTransform(new TestDecoratorForResultStrings(StringTransform.Downcase));
      const val = await store.get('meow');
      expect(val).toBe('CAT');
    });
  });

  describe.only('error in layer', () => {
    let callCount;

    const buildCallCountDecorator = (placement: TestFixtureDecoratorPlacement) => new TestFixtureArbitraryDecorator({
      method: DataMethod.Get,
      placement,
      callback: (ctx, decorator) => (callCount += 1),
    });
    const buildStoreWithError = (placement: TestFixtureDecoratorPlacement) => {
      store = buildMemoryStore(initialContent);
      store.useTransform(buildCallCountDecorator(placement));
      store.useTransform(new TestFixtureArbitraryDecorator({
        method: DataMethod.Get,
        placement,
        callback: (ctx, decorator) => ctx.error = 'Kaboom',
      }));
      store.useTransform(buildCallCountDecorator(placement));
    };

    beforeEach(() => {
      callCount = 0;
    });

    test('stop traversing request when error applied', async () => {
      buildStoreWithError(TestFixtureDecoratorPlacement.Before);
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
      buildStoreWithError(TestFixtureDecoratorPlacement.After);
      store.transforms.unshift(new TestFixtureArbitraryDecorator({
        method: DataMethod.Get,
        placement: TestFixtureDecoratorPlacement.After,
        callback: (ctx, decorator) => {
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


// todo: able to add, remove, and reorder decorators even after being used
});
