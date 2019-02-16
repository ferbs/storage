import Storage from '../src/storage-core';
import MemoryStore from "../src/memory-store";



describe('@wranggle/storage-core', () => {
  it('fahhh', async () => {
    const store = new Storage(new MemoryStore({ engine: { hi: 5 }}));
    const val = await store.get('hi');
    console.log('tmp - adapters.spec.ts. val', val);
    // expect(val).toEqual(5); // todo: use this once simplifyGetString in place
  });

});
