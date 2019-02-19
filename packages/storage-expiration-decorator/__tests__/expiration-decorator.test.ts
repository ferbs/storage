import {buildMemoryStore} from "@wranggle/storage-core/__tests__/test-support/fixture-support";
const _ = require('lodash');
import testBasicStoreBehaviors from "@wranggle/storage-core/__tests__/test-support/shared-behaves-like-store";
import ExpirationDecorator, {IStorageExpirationDecoratorOpts} from '../src/expiration-decorator';


describe('@wranggle/expiration-decorator', () => {
  let store, decorator;
  let timeSpy;
  const Now = 1e12;

  beforeEach(() => {
    timeSpy = jest.spyOn(Date, 'now').mockImplementation(() => Now);
    store = buildMemoryStore();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    decorator && decorator.stop();
  });

  const applyTestDecorator = (args=<Partial<IStorageExpirationDecoratorOpts>>{}) => {
    decorator = new ExpirationDecorator(args);
    store.useTransform(decorator);
  };

  const waitMs = (ms: number) => new Promise(resolve => setTimeout(() => resolve(), ms));

  testBasicStoreBehaviors(() => {
    applyTestDecorator();
    return store;
  });


  const RawFixtureData_StaleItem = {
    'stale:val_': 'bad',
    'stale:exp_': Now - 200,
    'recent:val_': 'good',
    'recent:exp_': Now + 100,
  };

  describe("item duration", () => {

    test('persist expiration timestamp when setting data', async () => {
      applyTestDecorator({ duration: 10000 });
      await store.set('aa', 11);
      const data = store.dataStore._dataObject;
      expect(data['aa:val_']).toBe(11);
      expect(data['aa:exp_']).toBe(Now + 10000);
      expect(_.size(data)).toBe(2);
    });

    test('interpret "primary" option as duration', async () => {
      applyTestDecorator({ primary: 5000 }); // set by StorageRequestContext/StorageCore when parsing user options
      await store.set('abc', 123);
      expect(_.get(store, 'dataStore._dataObject.abc:exp_')).toBe(Now + 5000);
    });

    test('permit passed-in user override duration when calling "set"', async () => {
      applyTestDecorator();
      await store.set('key1', 'myValue1', 1000);
      await store.set({ key2: 'myValue2' }, { duration: 2000 });
      await store.set({ key3: 'myValue3' }, 3000);
      const data = store.dataStore._dataObject;
      expect(_.size(data)).toBe(6);
      const expirations = [ 1,2,3 ].map(n => data[`key${n}:exp_`] - Now);
      expect(expirations).toEqual([ 1000, 2000, 3000 ]);
    });
  });


  describe("expired items", () => {
    beforeEach(() => {
      applyTestDecorator();
      Object.assign(store.dataStore._dataObject, RawFixtureData_StaleItem);
    });

    it('removes expired items on `get`', async () => {
      const vals = await store.get([ 'recent', 'stale' ]);
      expect(_.size(vals)).toBe(1);
      expect(vals.recent).toBe('good');
      expect(_.size(store.dataStore._dataObject)).toBe(2);
    });

    it('removes expired items for `keys`', async () => {
      const keys = await store.keys();
      expect(keys.length).toBe(1);
    });

    it('removes expired items for `snapshot`', async () => {
      const data = await store.snapshot();
      expect(data.recent).toBe('good');
    });

  });

  describe("expiration polling", () => {
    beforeEach(() => {
      jest.restoreAllMocks();
    });

    test('should check for expired items', async () => {
      applyTestDecorator({ polling: 1, duration: 1 });
      await store.set('poof', 'almost expired');
      await store.set('keep', 'longer', 100);
      const data = store.dataStore._dataObject;
      expect(_.size(data)).toBe(4);
      await waitMs(3);
      expect(_.size(data)).toBe(2);
    });

    test('should honor option to disable polling', async () => {
      applyTestDecorator({ polling: false, duration: 1 });
      const data = store.dataStore._dataObject;
      Object.assign(data, RawFixtureData_StaleItem);
      expect(_.size(data)).toBe(4);
      await waitMs(3);
      expect(_.size(data)).toBe(4);
      expect(data['stale:val_']).toBe('bad');
      await store.get('stale');
      expect(_.size(data)).toBe(2);
      expect(data['stale:val_']).toBeUndefined(); // removed by `get`
    });
  });

  // todo: test touchExpiration method
  // todo: test option for custom value/expiration suffix
  // todo: perhaps implement then test a reflective check of the middleware stack, erroring if it contains more than one ExpirationDecorator
});
