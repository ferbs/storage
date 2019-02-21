# @wranggle/storage

@wranggle/storage is a TypeScript/JavaScript library that brings middleware-style request-response functionality to any persistence 
library, letting you incrementally add layers of features to your preferred storage library, such as time-based 
item expiration, multiple namespaced instances, encryption, etc.

Unless specified otherwise, WranggleStorage will use the popular [LocalForage](https://github.com/localForage/localForage) library as
its underlying store when used on a web page. It also offers its own underlying stores for Node.js and Electron projects 
and another for browser addons/extensions but you can quite easily create an adapter to any other persistence library. (Covered 
in the Underlying Stores section below.)     
    
WranggleStorage is API compatible with all LocalForage [data methods](https://localForage.github.io/localForage/#data-api), additionally 
 adding [Google Chrome Storage API](https://developer.chrome.com/apps/storage#type-StorageArea) methods (with improvements), plus 
 some additional methods, like `snapshot` and the useful `createSubsetStore`. 


**NOTE:** this project is a work in progress--not yet published on NPM. 


## Example

In a browser, we might instantiate a WranggleStore and apply expiring-keys to it with the following:  

```
import WranggleStorage from "@wranggle/storage"; // or use a smaller environment-specific package (see below)  
const myStore = new WranggleStorage({ expire: 1000 * 60 * 40 });        
```

Without having specified an underlying store, it defaults to LocalForage (again, assuming a browser environment) and it
applies an ExpirationLayer to our store, deleting items after 40 minutes.   

We don't notice the presence of this ExpirationLayer in normal use, such as this: 

```
async () => {
  await myStore.setItem('one', 1); 
  await myStore.set({ two: 2, three: 3 });  
  return myStore.keys(); // the returned promise resolves to [ 'one', 'two', 'three' ]
}
```

All data-related methods are asynchronous, preferring promises (and async/await) but also accepting nodejs-style callbacks.   

If you inspect the actual data written from the above example (in localStorage/IndexedDB/WebSQL/other) you'll see it additionally 
holds its own expiration meta data which the ExpirationLayer enforces in later calls (and does its best to clean expired items up in the background.)     

We can also splinter off new stores that inherit the behaviors/layers of the parent store. Say we want to keep session data and 
feed data in separate buckets. Instead of manually adding a prefix to our keys everywhere they are used, we can conveniently 
create separate stores:

```
const sessionStore = myStore.createSubsetStore({ bucket: 'Session' });
const feedStore = myStore.createSubsetStore({ bucket: 'Feed' });
sessionStore.set('current', 'one thing').then(whatever); 
feedStore.set('current', 'something different').then(whatever); 
```

Both `sessionStore` and `feedStore` above can get/set the same key "current" without collision. Key prefixing is managed for 
us. The passed in "bucket" option told WranggleStorage to add a KeyNameLayer when it created our new subset stores. Each
of these inherits the expiration functionality from its "myStore" parent. 


## Feature Layers


* [ExpirationLayer](https://github.com/ferbs/storage/tree/master/packages/storage-expiration-layer): adds psuedo-expiration functionality for items. 

* [KeyNameLayer](https://github.com/ferbs/storage/tree/master/packages/storage-key-name-layer): adds prefix and/or suffix to item keys.  

* _ListeningLayer_: receives data method commands sent over RPC or some other messaging system. (coming soon)

* _ThrottledSetLayer_: Batches set/write commands, to minimize overly-frequent writes. (todo / not yet started)   

* _EncryptionLayer_: Encrypts persisted values. (todo / not yet started)


### Underlying Stores

You can specify which underlying data store you want when instantiating WranggleStorage.


### Browser environment

@wranggle/storage-browser bundles the following stores:
* LocalForage
* Extension Storage (for browser extension/add-on)
* RPC (to send commands by message to a receiving store which persists the data)  
* Memory (mainly for testing but also useful for headless browsing, extensions, etc) 

If not specified, it will use Extension storage if that API is detected, else LocalForage with a bucket named "main".


### Node.js environment

@wranggle/storage-node bundles the following stores:

* FileStore. Persists data as a file. Options to stream (eg, for compression, tar, etc) or to create timestamped backups. (coming soon)
* RPC 
* MemoryStore    
* ElectronRendererStore
 
 
### Creating Custom Stores and Adapters

todo: explain IDataStore interface


## WranggleStorage API

todo: write:
* list all data methods
* .use and .insertLayerAt
* createSubsetStore
* construction: programmatic example; serialized (details and examples) 


## Custom Data Layers

todo: explain IDataLayer; example extending NoopLayer

   
## Installation and distributions

NOTE: Not yet published on NPM (todo: build system)

For use purely in a browser environment, use _@wranggle/storage-browser_. For Node.js use _@wranggle/storage-node_.

If you are using a bundler (like webpack, browserify, or rollup) you can import just the layers/modules you need, 
published in _@wranggle/storage-es6_.

For Electron apps (both browser and node) or just for simplicity (none of this is very large) use the main _@wranggle/storage_ npm module,
 which includes everything mentioned above. 
 
 
 