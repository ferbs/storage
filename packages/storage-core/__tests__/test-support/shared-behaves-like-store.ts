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
      expect(bb).toBe(22);
      const cc = await store.get('cc');
      expect(cc.other[1]).toBe(333);
      const aaAndDd = await store.get([ 'aa', 'dd']);
      expect(aaAndDd.aa).toBe(11);
      expect(aaAndDd.dd).toBe(44);
    });

    test("length, keys, and clear", async () => {
      await store.set(SimpleFixtureData);
      let len = await store.length();
      expect(len).toBe(3);
      const keys = await store.keys();
      expect(keys.length).toBe(3);
      expect(keys[1]).toBe('bb');
      await store.clear();
      len = await store.length();
      expect(len).toBe(0);
    });

    test("remove and snapshot", async () => {
      await store.set(SimpleFixtureData);
      const snap1 = await store.snapshot();
      expect(Object.keys(snap1).length).toBe(3);
      expect(snap1.cc).toBe(33);
      await store.remove([ 'aa', 'cc' ]);
      const snap2 = await store.snapshot();
      expect(Object.keys(snap2).length).toBe(1);
      expect(snap2.bb).toBe(22);
    });
  });
}
