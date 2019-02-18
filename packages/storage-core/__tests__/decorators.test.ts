import {CharPlacement, StringTransform, TestDecoratorForKeys, TestDecoratorForResultStrings} from "./test-support/decorator-support";
import {buildMemoryStore} from "./test-support/fixture-support";


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
});
