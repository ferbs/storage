import Storage from "../src/storage-core";
import MemoryStore from "../src/memory-store";


describe('@wranggle/storage-core derived methods for LocalForge compatibility that are not part of IDataStoreLayer', () => {
  let store;
  beforeEach(async () => {
    store = new Storage(new MemoryStore());
    await store.set({
      aa: 'asparagus',
      bb: 'broccoli',
    })
  });


  test('"length" derived method works', async () => {
    const len = await store.length();
    expect(len).toEqual(2);
  });

  test('"iterate" derived method works', async () => {
    const collect = [];
    await store.iterate((val, key, ndx) => {
      collect.push({ val, key, ndx });
      return true;
    });
    expect(collect.length).toEqual(2);
    const row = collect[1];
    expect(row.val).toEqual('broccoli');
    expect(row.key).toEqual('bb');
    expect(row.ndx).toEqual(2);
  });

  test('"iterate" stops when user-passed iterator does not return a value', async () => {
    const collect = [];
    await store.iterate((val, key, ndx) => {
      collect.push({ val, key, ndx });
    });
    expect(collect.length).toEqual(1);
    expect(collect[0].ndx).toEqual(1);
  });
});