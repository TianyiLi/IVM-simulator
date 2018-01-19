const http = require('http')
const Stomp = require('stomp-broker-js')
const argv = require('minimist')(process.argv.slice(2))
const liveServer = require('live-server')
// const smc = require('./smc')
let server = http.createServer()
let stompServer = new Stomp({ server, debug () { console.log(arguments) } }, '/stomp')
let params = {
  port: 8000,
  host: '0.0.0.0',
  root: __dirname,
  open: false,
  wait: 3000,
  logLevel: 2,
  mount: [
    ['/demo-simulator', './smock-simulator'],
    ['/media/full', './ad-sample/full'],
    ['/media/standard', './ad-sample/standard'],
    ['/media/top', './ad-sample/top'],
    ['/prod_img', './products-sample'],
    ['/app/rest/stock.cgi', './rest-sample/stock.html'],
    ['/app/rest/channel.cgi', './rest-sample/channel.html'],
    ['/app/rest/media.cgi', './rest-sample/media.html'],
  ]
}
if (argv.dist && argv.dist !== '') {
  params.root = argv.dist
}
if (argv.port && argv.dist !== '' && /^\d*$/.test(argv.port)) {
  params.port = parseInt(argv.port)
}

server.listen(61614, '0.0.0.0', function () {
  console.log(`Stomp Server listening on 61614`)
})
liveServer.start(params)
console.log(Object.keys(liveServer))
console.log(`live server listen on ${params.port}\nserver path set to ${params.root}`)

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
  // smc.stomp.disconnect()
  // smc.server.close()
  server.close()
  stompServer.removeAllListeners()
  stompServer.
  liveServer.shutdown()
}

process.on('SIGINT', () => {
  exitProcess()
})
process.on('beforeExit', () => {
  exitProcess()
})
