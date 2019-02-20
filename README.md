# @wranggle/storage

@wranggle/storage is a TypeScript/JavaScript library that brings middleware-style request-response functionality to any persistence 
library, letting you incrementally add layers of features to your preferred storage library, such as time-based 
item expiration, multiple namespaced instances, encryption, etc.

Unless specified otherwise, WranggleStorage will use the popular [LocalForage](https://github.com/localForage/localForage) library as
its underlying store when used on a web page. It also offers a file store for Node.js projects and for browser addons/extensions, 
and you can quite easily create an adapter to any other persistence library. (Covered in the Underlying Stores section below.)     
    
It is API compatible with all LocalForage [data methods](https://localForage.github.io/localForage/#data-api), additionally 
adding [Google Chrome Storage API](https://developer.chrome.com/apps/storage#type-StorageArea) methods (with improvements),    
plus some additional methods, like `snapshot` and the useful `createSubsetStore`. 


**NOTE:** not yet finished or published on NPM. OSS work in progress. 


## Example

In a browser, we might instantiate a WranggleStore and apply expiring-keys to it with the following:  

```
import WranggleStorage from "@wranggle/storage"; // or use a smaller environment-specific package (see below)  
const myStore = new WranggleStorage(); // with nothing specified, it defaults to LocalForage in the browser, chrome.storage.local in a Chrome browser extension  
myStore.use({ expire: 1000 * 60 * 60 }); // uses ExpirationLayer, see docs for its options     
```

All data-related methods are asynchronous, preferring promises (and async/await) but also accepting nodejs-style callbacks. 
We don't notice the presence of the ExpirationLayer in normal use, such as when calling this function: 

```
async () => {
  await myStore.setItem('one', 1); 
  await myStore.set({ two: 2, three: 3 });  
  return myStore.keys(); // the returned promise resolves to [ 'one', 'two', 'three' ]
}
```

However, if you inspect the actual data (in localStorage/IndexedDB/WebSQL/other) you'll see it additionally holds expiration
data, which ExpirationLayer enforces in later calls (and does its best to clean expired items up in the background.)     

We can also splinter off new stores that inherit the behaviors/layers of the parent store. Say we want to keep session data and 
feed data in separate buckets. Instead of manually adding a prefix to our keys, we can conveniently create separate stores:

```
const sessionStore = myStore.createSubsetStore({ bucket: 'Session' });
const feedStore = myStore.createSubsetStore({ bucket: 'Feed' });
sessionStore.set('current', 'one thing').then(whatever); 
feedStore.set('current', 'something different').then(whatever); 
```

Both `sessionStore` and `feedStore` above can get/set the same key "current" without collision. The passed in "bucket" option
told WranggleStorage to add a KeyNameLayer to the new subset store, which manages key prefixing for you.



## Feature Layers


* [ExpirationLayer](/wranggle/storage/packages/storage-expiration-layer): adds psuedo-expiration functionality for items. 

* [KeyNameLayer](/wranggle/storage/packages/storage-key-name-layer): adds prefix and/or suffix to item keys.  

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
 
 
### Creating Custom Layers and Adapters

todo: explain IDataStore interface


  
## Installation and distributions

NOTE: Not yet published on NPM (todo: build system)

For use purely in a browser environment, use _@wranggle/storage-browser_. For Node.js use _@wranggle/storage-node_.
If you are using a bundler (like webpack, browserify, or rollup) you can import just the layers/modules you need, 
published in _@wranggle/storage-es6_.
   
For simplicity, the main _@wranggle/storage_ npm module includes everything mentioned above, even though some Layers 
require a file system and some require a browser. It uses more space but can be used cross-environment (such as in an Electron project.)



 