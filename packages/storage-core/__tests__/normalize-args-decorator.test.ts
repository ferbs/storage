import {buildMemoryStore} from "./test-support/fixture-support";


describe('@wranggle/storage-core/normalize-args-decorator', () => {
  let store;
  const initialContent = { aa: 'apple', bb: 'banana' };

  beforeEach(() => {
    store = buildMemoryStore(initialContent);
  });

  test("adds NormalizeArgsDecorator by default", () => {
    expect(store.transforms.length).toBe(1);
    expect(store.transforms[0].constructor.name).toBe('NormalizeArgsDecorator');
  });

  test("Extracts result from object only when a single key is provided in the user request", async () => {
    const single = await store.get('aa');
    const multiple = await store.get([ 'aa', 'bb' ]);
    expect(single).toBe('apple');
    expect(Object.keys(multiple).length).toBe(2);
    expect(multiple['bb']).toBe('banana');
  });
  
});