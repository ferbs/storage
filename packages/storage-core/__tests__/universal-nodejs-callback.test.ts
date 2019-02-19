import Storage from "../src/storage-core";
import MemoryStore from "../src/memory-store";


describe('@wranggle/storage-core nodejs-style callbacks', () => {
  // todo: perhaps move into shared-behaviors test

  let store;
  beforeEach(async () => {
    store = new Storage(new MemoryStore());
  });


  test('`length` derived method accepts callback', done => {
    const noPromise = store.length((err, val) => {
      expect(val).toBe(0);
      done();
    });
    expect(noPromise).toBeUndefined();
  });

  test('`set` and `get` core data methods accept callbacks', done => {
    const noPromise = store.set('nested', 'deeply', () => {
      store.get('nested', (err, val) => {
        expect(err).toBeFalsy();
        expect(val).toBe('deeply');
        done();
      });
    });
    expect(noPromise).toBeUndefined();
  });
});