# IVM-OFFLINE-SIMULATOR

## Required:

* nodejs ~8.9.1-lts

## How to use

```bash
$ npm install -g https://github.com/TianyiLi/IVM-simulator.git
```

* Start sample server

> default is working path

```bash
$ sample-server
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

### Custom Media folder service

If you want to serve your own media data, you can use bellow argument to assign the folder path.

```bash
$ sample-server --media=<path-to-media>
```

And, be sure of your folder as following structure

```bash
├── full
│   └── test.mp4
└── standard
    └── test.png
```

Than, you can get the list from '/app/rest/media.cgi'

```json
[
  {
    "src": "http://localhost/media/full/test.mp4",
    "desc": "test.mp4",
    "position": "full",
    "type": "video",
    "title": "test.mp4",
    "id": 0
  },
  {
    "src": "http://localhost/media/standard/test.png",
    "desc": "test.png",
    "position": "standard",
    "type": "image",
    "title": "test.png",
    "id": 1,
    "duration": 10
  },
]
```

### Custom stock list service

If you want to serve your own stock list, you need to make a config file like

```json
[
  {
        "dm" : "http://localhost/test.png",
        "name" : "test",
        "img" : "http://localhost/test.png",
        "desc" : "",
        "id" : "1",
        "title" : "test",
        "price" : 50,
        "soldout" : false
  }
]
```

Be aware that 'dm' and 'img' two properties should be work.

* Get more info by

```bash
$ sampler-server --help
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
