import {buildMemoryStore} from "./test-support/fixture-support";


describe('@wranggle/storage-core', () => {
  describe('derived methods for LocalForge compatibility that are otherwise not part of IDataStoreLayer', () => {
    let store;
    beforeEach(async () => {
      store = buildMemoryStore();
      await store.set({
        aa: 'asparagus',
        bb: 'broccoli',
      })
    });


    test('`length` derived method works', async () => {
      const len = await store.length();
      expect(len).toBe(2);
    });

    test('`iterate` derived method works', async () => {
      const rows = [];
      const testIterator = (val, key, ndx) => {
        rows.push({ val, key, ndx });
        return true;
      };
      await store.iterate(testIterator);

      expect(rows.length).toBe(2);
      const row = rows[1];
      expect(row.val).toBe('broccoli');
      expect(row.key).toBe('bb');
      expect(row.ndx).toBe(2);
    });

    test('`iterate` stops when user-passed iterator does not return a value', async () => {
      const collect = [];
      await store.iterate((val, key, ndx) => {
        collect.push({ val, key, ndx });
      });
      expect(collect.length).toBe(1);
      expect(collect[0].ndx).toBe(1);
    });


    // note: testing shared namespaces in key-name-decorator.test.ts. Something here would be nice though

    // todo: getItem, setItem, removeItem, clear

  });
});