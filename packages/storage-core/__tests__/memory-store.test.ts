import Storage from '../src/storage-core';
import MemoryStore from "../src/memory-store";
import {CharPlacement, ChangeTypeForTestDecorator, TestDecoratorForKeys, TestDecoratorForGetResultStrings} from "./test-support/decorator-support";
import testBasicStoreBehaviors from "./test-support/shared-behaves-like-store";


describe('@wranggle/memory-store', () => {

  testBasicStoreBehaviors(() => new Storage(new MemoryStore()));

});
