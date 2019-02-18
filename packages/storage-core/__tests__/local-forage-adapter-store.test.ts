const LocalForage = require('localforage');
import Storage from '../src/storage-core';
import testBasicStoreBehaviors from "./test-support/shared-behaves-like-store";
import 'jest-localstorage-mock';


describe('@wranggle/storage-core/local-forage-adapter-store', () => {

  testBasicStoreBehaviors(() => new Storage(LocalForage));

  describe("configured instances/drivers", () => {
    let store, localForage;

    beforeEach(() => {
      localForage = LocalForage.createInstance({name: "testInstance"});
      store = new Storage(localForage);
    });

    test("named instance should not affect user keys", async () => {
      await store.set('hi', 5);
      const val = await store.get('hi');
      expect(val).toBe(5);
    });
  });

});
