# IVM-OFFLINE-SIMULATOR

## Required:

* nodejs ~8.9.1-lts

## How to use

```bash
$ npm install -g https://github.com/TianyiLi/IVM-simulator.git
```

* Start sample server

```bash
$ sample-server --dist <path-to-gui>
```

* Start SMC service

```bash
$ smc-service
```

Or 

```
$ git clone https://github.com/TianyiLi/IVM-simulator.git

$ cd IVM-simulator

> start live-server and stomp server
$ node index.js --dist [path]

> start smc service
$ node smc.js
```



## URL

|url| Description|
|:---|:---:|
|/                |Your index.html where you assigned to index.js |
|/demo-simulator|Simulator console where can allow you to simulate the vending machine action|
|/media/{full, standard}|media place|
|/prod_img|Product image storing place|
|/app/rest/stock.cgi|stock list|
|/app/rest/media.cgi|media list|
|/app/rest/channel.cgi|channel list|
|/app/rest/sys.cgi|System error would display at here|
|/demo|show the whole page which you serve on /|

For more information please view the WIKI
