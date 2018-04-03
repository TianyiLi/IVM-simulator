#!/usr/bin/env node
const http = require('http')
const Stomp = require('stomp-broker-js')

const fs = require('fs')
const url = require('url')
const path = require('path')
const liveServer = require('live-server')

global.Promise = require('bluebird')

/**
 * sample-server argument setup
 * @type {{on?:boolean, 'chno-length':string, product?:string ,'stock-config'?:string, host?:string, dist:?string, port?:string, media?:string, 'only-broker'?:boolean, 'only-live-server'?:boolean, quiet:boolean}}
 */
const argv = require('minimist')(process.argv.slice(2))
const media = require('./lib/media-list-generate')
const product = require('./lib/products-list-generate')

if (argv['h'] || argv['help'] || argv['H']) {
  console.log('Usage: sample-server [options]')
  console.log(`
  Options
    --on                      [start browser automatically]
    --host=[path]             [live-server host path]
    --dist=[path]             [live-server root path]
    --port=[port]             [live-server port]
    --media=[path]            [media folder service place]
    --stock=[path]          [serve your own product image]
    --chno-length=[number]    [channel list length setup]
    --only-broker             [run only stomp broker]
    --only-live-server        [run only live-server]
    --quiet                   [live-server log level set to 0]
  `)
  process.exit(0)
}

let server = http.createServer()
let stompServer = new Stomp({ server, debug () { process.env.NODE_DEBUG && console.log(arguments) } }, ['/stomp', '/stomp/websocket'])
let mediaFolderServicePath = path.normalize((argv.media && argv.media !== true && fs.existsSync(argv.media)) && argv.media || __dirname + '/ad-sample')
let productFolderPath = path.normalize((argv.stock && argv.stock !== true && fs.existsSync(argv.stock)) && argv.stock || __dirname + '/products-sample')

let params = {
  port: 80,
  brokerPort: 61614,
  host: 'localhost',
  root: process.cwd(),
  open: argv.on,
  wait: 3000,
  logLevel: 2,
  mount: [
    ['/demo-simulator', __dirname + '/smock-simulator'],
    ['/media', mediaFolderServicePath],
    ['/products', productFolderPath],
    ['/app/rest/sys.cgi', __dirname + '/rest-sample/sys.json'],
    ['/demo', __dirname + '/demo']
  ],
  middleware: [
    function jsonRenew (request, response, next) {
      let _url = url.parse(request.url)
      let pathName = _url.pathname
      if (pathName.startsWith('/app/rest')) {
        let _part = pathName.replace('/app/rest/', '')
        if (_part === 'media.cgi') {
          let mediaList = media.getList(request.headers.host, mediaFolderServicePath)
          response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
          response.end(JSON.stringify(mediaList, null, 4))
        }
        if (_part === 'stock.cgi') {
          let stockList = product.getStockList(request.headers.host, productFolderPath)
          response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
          response.end(JSON.stringify(stockList, null, 4))
        }
        if (_part === 'channel.cgi') {
          let len = parseInt(argv['chno-length'] && argv['chno-length'] ? argv['chno-length'] : '-1')
          let channelList = product.getChannelList(request.headers.host, productFolderPath, len)
          response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
          response.end(JSON.stringify(channelList, null, 4))
        }
      }
      next()
    }
  ]
}

if (argv.dist && argv.dist !== true) {
  params.root = argv.dist
}
if (argv.port && argv.port !== true && /^\d*$/.test(argv.port)) {
  params.port = parseInt(argv.port)
}
if (argv.quiet) {
  params.logLevel = 0
}
if (argv.host && argv.host !== true) {
  params.host = argv.host
}
if (process.env.NODE_DEBUG) {
  stompServer.subscribe('/**', function (msg, headers) {
    var topic = headers.destination
    console.log(topic, '->{' + (typeof msg) + '}', msg, headers)
  })
}
stompServer.on('error', function (err) {
  console.error(err)
})
function exitProcess () {
  server.close()
  stompServer.removeAllListeners()
  liveServer.shutdown()
  process.exit(0)
}

process.on('SIGINT', () => {
  exitProcess()
})
process.on('beforeExit', () => {
  exitProcess()
})

stompServer.start()

module.exports.SamplerServer = liveServer
module.exports.StompBrokerServer = server
module.exports.config = params
module.exports.close = exitProcess

if (!module.parent) {
  let status = 0
  if (argv['only-broker']) {
    status += 1
  } else if (argv['only-live-server']) {
    status += 2
  }

  (status === 0 || status === 1) && server.listen(61614, 'localhost', () => {
    console.log('StompBroker listen on 61614')
  });
  (status === 0 || status === 2) && (function () {
    liveServer.start(params)
    console.log(`live server listen on ${params.port}\nserver path set to ${params.root}`)
  })();
}
