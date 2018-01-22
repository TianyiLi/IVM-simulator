# IVM-OFFLINE-SIMULATOR

## Required:

* nodejs ~8.9.1-lts

## How to use


```
> start live-server and stomp server
$ node index.js --dist [path]

> start smc service
$ node smc.js
```

Linux

```bash
export PATH=$PATH:<path-to-bin>

# goto any folder
lite-server --dist <your sample folder>
smc-service.sh
```

## URL

|url| Description|
|:---|:---:|
|/                |Your index.html where you assigned to index.js |
|/demo            |Show the view |
|/demo-simulator  |simulator |
|:8080/stat       |smc stat |
|:8080/sess       |session data |


