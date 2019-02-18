import Storage from '../../src/storage-core';


export default function testBasicStoreBehaviors(buildSubject: () => Storage) {
  let store;

  const SimpleFixtureData = { aa: 11, bb: 22, cc: 33 };

  describe("shared-behaves-like-store", () => {
    beforeEach(async () => {
      store = buildSubject();
      await store.clear();
    });

    test("set then get", async () => {
      await store.set({ aa: 11, bb: 22 });
      await store.set('cc', { other: [ 300, 333 ] });
      await store.setItem('dd', 44);
      const bb = await store.getItem('bb');
      expect(bb).toEqual(22);
      const cc = await store.get('cc');
      expect(cc.other[1]).toEqual(333);
      const aaAndDd = await store.get([ 'aa', 'dd']);
      expect(aaAndDd.aa).toEqual(11);
      expect(aaAndDd.dd).toEqual(44);
    });

    test("length, keys, and clear", async () => {
      await store.set(SimpleFixtureData);
      let len = await store.length();
      expect(len).toEqual(3);
      const keys = await store.keys();
      expect(keys.length).toEqual(3);
      expect(keys[1]).toEqual('bb');
      await store.clear();
      len = await store.length();
      expect(len).toEqual(0);
    });

    test("remove and snapshot", async () => {
      await store.set(SimpleFixtureData);
      const snap1 = await store.snapshot();
      expect(Object.keys(snap1).length).toEqual(3);
      expect(snap1.cc).toEqual(33);
      await store.remove([ 'aa', 'cc' ]);
      const snap2 = await store.snapshot();
      expect(Object.keys(snap2).length).toEqual(1);
      expect(snap2.bb).toEqual(22);
    });
  });
}
