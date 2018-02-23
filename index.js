#!/usr/bin/env node
const http = require('http')
const Stomp = require('stomp-broker-js')
const argv = require('minimist')(process.argv.slice(2))
const liveServer = require('live-server')
if (argv['h'] || argv['help'] || argv['H']) {
  console.log('Usage: sample-server [options]')
  console.log('\nOptions')
  console.log('\t--dist \t[live-server root path]')
  console.log('\t--port \t[live-server port]')
  console.log('\t--quiet\tlive-server log level set to 0')
  console.log('\t--only-broker\t[run only stomp broker]')
  console.log('\t--only-live-server\t[run only live-server]')
  return
}

let server = http.createServer()
let stompServer = new Stomp({ server, debug () { process.env.NODE_DEBUG && console.log(arguments) } }, '/stomp')
let params = {
  port: 80,
  host: '0.0.0.0',
  root: __dirname,
  open: true,
  wait: 3000,
  logLevel: 2,
  mount: [
    ['/demo-simulator', __dirname + '/smock-simulator'],
    ['/media', __dirname + '/ad-sample'],
    ['/prod_img', __dirname + '/products-sample'],
    ['/app/rest/stock.cgi', __dirname + '/rest-sample/stock.json'],
    ['/app/rest/channel.cgi', __dirname + '/rest-sample/channel.json'],
    ['/app/rest/media.cgi', __dirname + '/rest-sample/media.json'],
    ['/app/rest/sys.cgi', __dirname + '/rest-sample/sys.json'],
    ['/demo', __dirname + '/demo']
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

  (status === 0 || status === 1) && server.listen(61614, '0.0.0.0', function () {
    console.log(`Stomp Server listening on 61614`)
  });
  (status === 0 || status === 2) && (function () {
    liveServer.start(params)
    console.log(`live server listen on ${params.port}\nserver path set to ${params.root}`)
  })();
}
