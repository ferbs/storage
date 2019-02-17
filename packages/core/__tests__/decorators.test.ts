import Storage from '../src/storage-core';
import MemoryStore from "../src/memory-store";
import {CharPlacement, StringTransform, TestDecoratorForKeys, TestDecoratorForResultStrings} from "./support/decorator-support";


describe('@wranggle/storage-core/decorators', () => {
  let store;

  const buildStore = (data={}) => new Storage(new MemoryStore({ engine: data }));
  const initialContent = { moo: 'Cow', meow: 'Cat' };


  describe('modify keys requested', () => {
    beforeEach(() => {
      store = buildStore(initialContent);
    });

    test('before-phase transforms are applied', async () => {
      store.useTransform(new TestDecoratorForKeys(CharPlacement.Prefix, 'm'));
      const val = await store.get('oo');
      expect(val).toEqual('Cow');
    });

    test('transform applied to keys in order added, oldest first, middleware-style', async () => {
      store.useTransform(new TestDecoratorForKeys(CharPlacement.Suffix, 'o'));
      store.useTransform(new TestDecoratorForKeys(CharPlacement.Suffix, 'w'));
      const val = await store.get('me');
      expect(val).toEqual('Cat');
    });
  });

  describe('modify returned results', () => {
    beforeEach(() => {
      store = buildStore(initialContent);
    });

    test('after-phase transforms are applied', async () => {
      store.useTransform(new TestDecoratorForResultStrings(StringTransform.Prepend, 'Big_'));
      const val = await store.get('moo');
      expect(val).toEqual('Big_Cow');
    });

    test('transforms are applied to result in reverse of order added, newest first, middleware-style', async () => {
      store.useTransform(new TestDecoratorForResultStrings(StringTransform.Upcase));
      store.useTransform(new TestDecoratorForResultStrings(StringTransform.Downcase));
      const val = await store.get('meow');
      expect(val).toEqual('CAT');
    });
  });
});
