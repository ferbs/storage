import {buildMemoryStore} from "@wranggle/storage-core/__tests__/test-support/fixture-support";
const _ = require('lodash');
import testBasicStoreBehaviors from "@wranggle/storage-core/__tests__/test-support/shared-behaves-like-store";
import KeyNameLayer, {IKeyNameLayerOpts} from "../src/key-name-layer";


describe('@wranggle/storage-key-name-layer', () => {
  
  const buildStore = (opts: Partial<IKeyNameLayerOpts>, initialData={}) => {
    const store = buildMemoryStore(initialData);
    store.useTransform(new KeyNameLayer(opts));
    return store;
  };
  const getRawData = (store) => store.backingStore._dataObject;

  testBasicStoreBehaviors(() => buildStore({ bucket: 'testKeyNameLayer' }));

  test('prefix', async () => {
    const store = buildStore({ prefix: 'pre:' });
    await store.set('aa', 11);
    const val = await store.get('aa');
    const raw = getRawData(store);
    expect(Object.keys(raw)[0]).toBe('pre:aa');
    expect(_.size(raw)).toBe(1);
    expect(val).toBe(11);
  });

  test('suffix', async () => {
    const store = buildStore({ suffix: ':hmm' });
    await store.set('key', 'val');
    const val = await store.get('key');
    const raw = getRawData(store);
    expect(Object.keys(raw)[0]).toBe('key:hmm');
    expect(_.size(raw)).toBe(1);
    expect(val).toBe('val');
  });

  test('bucket', async () => {
    const store = buildStore({ bucket: 'Channel' });
    await store.set('key', 'val');
    expect(Object.keys(getRawData(store))[0]).toBe('Channel/key');
    expect(await store.get('key')).toBe('val');
  });

  test('using prefix, suffix, and bucket together', async () => {
    const store = buildStore({ bucket: 'ok', prefix: 'pre:', suffix: ':post' });
    await store.set('key', 'val');
    expect(Object.keys(getRawData(store))[0]).toBe('pre:ok/key:post');
    expect(await store.get('key')).toBe('val');
  });

  describe('restricted to own namespace', () => {
    let store;
    const InitialData = {
      'OtherBucket_1/key': 'bad',
      'MyBucket/key': 'good',
      'OtherBucket_2/key': 'bad',
    };
    beforeEach(() => {
      store = buildStore({ bucket: 'MyBucket' }, InitialData);
    });

    test('get', async () => {
      const val = await store.get('key');
      expect(val).toBe('good')
    });

    test('clear and length', async () => {
      expect(await store.length()).toBe(1);
      await store.clear();
      const otherKeys = Object.keys(getRawData(store));
      expect(otherKeys.length).toBe(2);
      expect(await store.length()).toBe(0);
    });
  });
  
  
  describe('invalid construction', () => {
    test('requires prefix or suffix', () => {
      expect(() => new KeyNameLayer()).toThrow()
    });
  });
   
  describe('used in subset store', () => {
    let store_1, store_2, common;
    beforeEach(() => {
      common = buildStore({ bucket: 'Common' });
      store_1 = common.createSubsetStore();
      store_1.useTransform(new KeyNameLayer({ suffix: ':one' }));
      store_2 = common.createSubsetStore();
      store_2.useTransform(new KeyNameLayer({ suffix: ':two' }));
    });
    
    test('maintain separate namespaces', async () => {
      await store_1.set('aa', 'aa11');
      await store_2.set('aa', 'aa22');
      const rawData = getRawData(common);
      expect(rawData).toEqual({
        'Common/aa:one': 'aa11',
        'Common/aa:two': 'aa22'
      });
      const val_1 = await store_1.get('aa');
      const val_2 = await store_2.get('aa');
      expect(val_1).toBe('aa11');
      expect(val_2).toBe('aa22');
      expect(await store_1.keys()).toEqual([ 'aa' ]);
      expect(await store_2.keys()).toEqual([ 'aa' ]);
    });

    test('root store data available to subset', async () => {
      await store_1.set('key', 'val');
      await store_2.set('key', 'val');
      await common.set('another:two', 2);
      expect(await store_2.keys()).toEqual([ 'key', 'another'] )
    });

    test('sanity check for `clear`', async () => {
      await store_1.set('key', 'val');
      await store_2.set('key', 'val');
      await store_1.clear();
      expect(await store_1.length()).toBe(0);
      expect(await store_2.length()).toBe(1);
      expect(await common.length()).toBe(1);
      expect(getRawData(common)['Common/key:two']).toBe('val');
    });
  });


});
