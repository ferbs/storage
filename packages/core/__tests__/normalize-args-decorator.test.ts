import Storage from '../src/storage-core';
import MemoryStore from "../src/memory-store";


describe('@wranggle/storage-core/normalize-args-decorator', () => {
  let store;

  const buildStore = (data={}) => new Storage(new MemoryStore({ engine: data }));
  const initialContent = { aa: 'apple', bb: 'banana' };

  beforeEach(() => {
    store = buildStore(initialContent);
  });

  test("adds NormalizeArgsDecorator by default", () => {
    expect(store.transforms.length).toEqual(1);
    expect(store.transforms[0].constructor.name).toEqual('NormalizeArgsDecorator');
  });

  test("Extracts result from object only when a single key is provided in the user request", async () => {
    const single = await store.get('aa');
    const multiple = await store.get([ 'aa', 'bb' ]);
    expect(single).toEqual('apple');
    expect(Object.keys(multiple).length).toEqual(2);
    expect(multiple['bb']).toEqual('banana');
  });
  
});