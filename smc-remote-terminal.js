const { StompService, stompConfig } = require('stomp-service')
const argv = require('minimist')(process.argv.slice(2))
const rl = require('readline')
const axios = require('axios').default

let _interface = rl.createInterface(process.stdin, process.stdout)
let service = new StompService()

function f (...args) {
  return args.find(ele => !!ele)
}

let host = f(argv['host'], 'smock.transtep.com')
let sub = f(argv['sub'], '/topic/app')
let pub = f(argv['pub'], '/queue/app')
let config = {
  host: host,
  port: 61614,
  subscribe: [sub],
  publish: [pub],
  debug: false,
  path: '/stomp'
}
service.configure(config)

service.on('connected', () => {
  console.log('connected')
})

service.on('message', line => {
  console.log(line)
})

async function readLine (line) {
  if (line === '') return _interface.prompt()
  if (line === 'state') {
    let globalState = await axios.get(`http://${host}/app/rest/stat.cgi`).then(res => res.data)
    return console.log(globalState);
  }
  if (line === 'sess') {
    let globalSess = await axios.get(`http://${host}/app/rest/sess.cgi`).then(res=>res.data)
    return console.log(JSON.stringify(globalSess, null, 2));
  }
  if (line === 'help') {
    console.log('[Options]')
    console.log('state\tCheck current modules state')
    console.log('sess\tCheck current session data')
    console.log('help\tThis help')
    console.log('ok\tdispense ok simulate')
    console.log('\nData transition')
    console.log('[event-name] [argument]')
    console.log('For example: \norder/ordered {"p_id":"486"}\n')
    return
  }
  if (line === '.exit') { return 'exit' }
  let _line = line.split(/\s+/g)
  console.log(_line)
  let [e, arg] = _line
  let send = { e }
  try {
    let _arg = JSON.parse(arg)
    send = Object.assign(send, { arg: _arg })
  } catch (error) {
    // console.log(error)
  }
  console.log('%j', send)
  service.emit('publish', send)
}

service.start()
_interface.setPrompt('smc> ')
_interface.prompt()
function _prompt (fn) {
  return (line) => Promise.resolve(fn(line)).then((result) => {
    if (result === 'exit') return process.emit('SIGINT')
    _interface.prompt()
  })
}

process.on('SIGINT', ()=> {
  _interface.close()
  service.disconnect()
})

_interface.on('line', line => _prompt(readLine)(line))