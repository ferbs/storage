import Storage from '../../src/storage-core';
import MemoryStore from "../../src/memory-store";


export function buildMemoryStore(initData={}) {
  return new Storage(new MemoryStore({ engine: initData }));
}