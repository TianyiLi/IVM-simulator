#!/usr/bin/env node

const conf = require('./smc_config.js')
const StateMachine = require('javascript-state-machine')
const merge = require('merge')
const http = require('http')
const URL = require('url')
const service = require('./biz-logic')
const { EventEmitter } = require('events')
const { StompService, stompConfig } = require('stomp-service')
const { bizHandler } = require('./biz-logic')
const axios = require('axios').default

const argv = require('minimist')(process.argv.slice(2))

let { globalSess } = require('./biz-logic/session-storage')
global.Promise = require('bluebird')

const rl = require('readline')

let globalState = {}

let innerProcess = new EventEmitter()
let msgQueue = []
let msgQueueFlag = false

let client = new StompService()
let fsm = {}

let _interface = rl.createInterface(process.stdin, process.stdout)

function log () {
  if (process.env.NODE_DEBUG || isRemote()) {
    console.log(...arguments)
  }
}

function isRemote () {
  let state = (argv['host'] && !(/(localhost|0\.0\.0\.0|127\.0\.0\.1)/.test(argv['host'])))
  return state
}

client.configure({
  host: argv['host'] || conf.ebus_broker,
  port: 61614,
  subscribe: [conf.trig_chan],
  publish: [conf.tran_chan],
  debug: false,
  path: '/stomp'
})


let g_onLeaveState = function (lc, args) {
  log(this.id + '/' + lc.transition + ' ' + this.id + '/leave_' + lc.from)
  let e = { e: this.id + '/leave_' + lc.from, from: lc.from, to: lc.to, on: lc.transition }
  if (args) {
    e.arg = args
    log('arg ' + JSON.stringify(args))
  }
  client.emit('publish', e)
}

let g_onEnterState = function (lc, args) {
  this.refreshScoreboard()
  log(this.id + '/' + lc.transition + ' ' + this.id + '/enter_' + lc.to)
  let e = { e: this.id + '/enter_' + lc.to, from: lc.from, to: lc.to, on: lc.transition }
  if (args) {
    e.arg = args
    log('arg ' + JSON.stringify(args))
  }

  client.emit('publish', e)
}

let g_onAfterEvent = function (lc, args) {
  if (lc.transition == 'goto') return
  log(this.id + '/' + lc.transition + ' ' + this.id + '/after_' + lc.transition)
  let e = { e: this.id + '/after_' + lc.transition, from: lc.from, to: lc.to, on: lc.transition }
  if (args) {
    e.arg = args
    log('arg ' + JSON.stringify(args))
  }

  client.emit('publish', e)
  innerProcess.emit('afterFinished')
}

let g_onBeforeEvent = function (lc, args) {
  let id = this.id

  if (lc.transition === 'goto') return
  log(this.id + '/' + lc.transition + ' ' + this.id + '/before_' + lc.transition)
  let e = { e: id + '/before_' + lc.transition, from: lc.from, to: lc.to, on: lc.transition }
  if (id === 'order' && lc.transition === 'ordered') {
    globalSess = null
    globalSess = {}
  } else if (lc.transition === 'start') {
    globalSess[id] = null
    globalSess[id] = {}
  }
  if (args) {
    e.arg = args
    log('arg ' + JSON.stringify(args))

    client.emit('publish', e)
    let arg = globalSess[id]
    globalSess[id] = merge.recursive(true, arg, args)
  } else {
    client.emit('publish', e)
  }
}

let g_handler = {
  onBeforeTransition: g_onBeforeEvent,
  onLeaveState: g_onLeaveState,
  onEnterState: g_onEnterState,
  onAfterTransition: g_onAfterEvent
}

let map = {
  sys: [
    { 'name': 'goto', 'from': '*', 'to': function (s) { return s } },
    { 'from': 'none', 'name': 'start', 'to': 'INIT' },
    { 'from': 'INIT', 'name': 'sys_op', 'to': 'OPERATION' },
    { 'from': 'INIT', 'name': 'sys_suspended', 'to': 'SUSPEND' },
    { 'from': 'OPERATION', 'name': 'sys_admin', 'to': 'ADMIN' },
    { 'from': 'OPERATION', 'name': 'sys_suspended', 'to': 'SUSPEND' },
    { 'from': 'OPERATION', 'name': 'config_changed', 'to': 'OPERATION' },
    { 'from': 'OPERATION', 'name': 'hint', 'to': 'OPERATION' },
    { 'from': 'ADMIN', 'name': 'sys_op', 'to': 'OPERATION' },
    { 'from': 'ADMIN', 'name': 'sys_suspended', 'to': 'SUSPEND' },
    { 'from': 'ADMIN', 'name': 'sys_shutdown', 'to': 'SHUTDOWN' },
    { 'from': 'ADMIN', 'name': 'set', 'to': 'ADMIN' },
    { 'from': 'ADMIN', 'name': 'hint', 'to': 'ADMIN' },
    { 'from': 'SUSPEND', 'name': 'sys_op', 'to': 'OPERATION' },
    { 'from': 'SUSPEND', 'name': 'sys_admin', 'to': 'ADMIN' },
    { 'from': 'SUSPEND', 'name': 'sys_shutdown', 'to': 'SHUTDOWN' },
    { 'from': 'SUSPEND', 'name': 'hint', 'to': 'SUSPEND' }
  ],
  sess: [
    { 'name': 'goto', 'from': '*', 'to': function (s) { return s } },
    { 'from': 'none', 'name': 'start', 'to': 'IDLE' },
    { 'from': 'IDLE', 'name': 'hint', 'to': 'IDLE' },
    { 'from': 'IDLE', 'name': 'session_begin', 'to': 'SESSION' },
    { 'from': 'SESSION', 'name': 'hint', 'to': 'SESSION' },
    { 'from': 'SESSION', 'name': 'timeout', 'to': 'IDLE' },
    { 'from': 'SESSION', 'name': 'refresh_timer', 'to': 'SESSION' },
    { 'from': 'SESSION', 'name': 'session_end', 'to': 'IDLE' }
  ],
  order: [
    { 'name': 'goto', 'from': '*', 'to': function (s) { return s } },
    { 'from': 'none', 'name': 'start', 'to': 'MENU' },
    { 'from': 'MENU', 'name': 'input', 'to': 'MENU' },
    { 'from': 'MENU', 'name': 'hint', 'to': 'MENU' },
    { 'from': 'MENU', 'name': 'ordered', 'to': 'MENU' },
    { 'from': 'MENU', 'name': 'cancelled', 'to': 'END' },
    { 'from': 'MENU', 'name': 'timeout', 'to': 'END' }
  ],
  payment: [
    { 'name': 'goto', 'from': '*', 'to': function (s) { return s } },
    { 'from': 'none', 'name': 'start', 'to': 'PREPARE' },
    { 'from': 'PREPARE', 'name': 'hint', 'to': 'PREPARE' },
    { 'from': 'PREPARE', 'name': 'input', 'to': 'PREPARE' },
    { 'from': 'PREPARE', 'name': 'timeout', 'to': 'END' },
    { 'from': 'PREPARE', 'name': 'cancelled', 'to': 'END' },
    { 'from': 'PREPARE', 'name': 'failed', 'to': 'END' },
    { 'from': 'PREPARE', 'name': 'set_countdown', 'to': 'PREPARE' },
    { 'from': 'PREPARE', 'name': 'reset_countdown', 'to': 'PREPARE' },
    { 'from': 'PREPARE', 'name': 'payment_begin', 'to': 'TRANSACTION' },
    { 'from': 'TRANSACTION', 'name': 'hint', 'to': 'TRANSACTION' },
    { 'from': 'TRANSACTION', 'name': 'input', 'to': 'TRANSACTION' },
    { 'from': 'TRANSACTION', 'name': 'timeout', 'to': 'END' },
    { 'from': 'TRANSACTION', 'name': 'paid', 'to': 'END' },
    { 'from': 'TRANSACTION', 'name': 'cancelled', 'to': 'END' },
    { 'from': 'TRANSACTION', 'name': 'failed', 'to': 'END' },
    { 'from': 'TRANSACTION', 'name': 'set_countdown', 'to': 'TRANSACTION' },
    { 'from': 'TRANSACTION', 'name': 'reset_countdown', 'to': 'TRANSACTION' },
    { 'from': 'END', 'name': 'hint', 'to': 'END' },
    { 'from': 'END', 'name': 'set_countdown', 'to': 'END' },
    { 'from': 'END', 'name': 'reset_countdown', 'to': 'END' },
    { 'from': 'END', 'name': 'refund', 'to': 'END' }
  ],
  dispense: [
    { 'name': 'goto', 'from': '*', 'to': function (s) { return s } },
    { 'from': 'none', 'name': 'start', 'to': 'PREPARE' },
    { 'from': 'PREPARE', 'name': 'failed', 'to': 'END' },
    { 'from': 'PREPARE', 'name': 'ready', 'to': 'DISPENSE' },
    { 'from': 'PREPARE', 'name': 'hint', 'to': 'PREPARE' },
    { 'from': 'DISPENSE', 'name': 'hint', 'to': 'DISPENSE' },
    { 'from': 'DISPENSE', 'name': 'prod_dispensed', 'to': 'END' },
    { 'from': 'DISPENSE', 'name': 'prod_stuck', 'to': 'REDISPENSE' },
    { 'from': 'DISPENSE', 'name': 'failed', 'to': 'END' },
    { 'from': 'REDISPENSE', 'name': 'hint', 'to': 'REDISPENSE' },
    { 'from': 'REDISPENSE', 'name': 'prod_dispensed', 'to': 'END' },
    { 'from': 'REDISPENSE', 'name': 'prod_stuck', 'to': 'END' },
    { 'from': 'REDISPENSE', 'name': 'failed', 'to': 'END' },
    { 'from': 'END', 'name': 'hint', 'to': 'END' }
  ],
  auth: [
    { 'name': 'goto', 'from': '*', 'to': function (s) { return s } },
    { 'from': 'none', 'name': 'start', 'to': 'UNAUTHEN' },
    { 'from': 'UNAUTHEN', 'name': 'auth_request', 'to': 'UNAUTHEN' },
    { 'from': 'UNAUTHEN', 'name': 'hint', 'to': 'UNAUTHEN' },
    { 'from': 'UNAUTHEN', 'name': 'auth_failed', 'to': 'UNAUTHEN' },
    { 'from': 'UNAUTHEN', 'name': 'auth_ok', 'to': 'AUTHEN' },
    { 'from': 'UNAUTHEN', 'name': 'stop', 'to': 'none' },
    { 'from': 'AUTHEN', 'name': 'logout', 'to': 'UNAUTHEN' },
    { 'from': 'AUTHEN', 'name': 'stop', 'to': 'none' }
  ],
  invoice: [
    { 'name': 'goto', 'from': '*', 'to': function (s) { return s } },
    { 'from': 'none', 'name': 'start', 'to': 'PREPARE' },
    { 'from': 'PREPARE', 'name': 'input', 'to': 'PREPARE' },
    { 'from': 'PREPARE', 'name': 'hint', 'to': 'PREPARE' },
    { 'from': 'PREPARE', 'name': 'donated', 'to': 'PROCESS' },
    { 'from': 'PREPARE', 'name': 'stored', 'to': 'PROCESS' },
    { 'from': 'PREPARE', 'name': 'printout', 'to': 'PROCESS' },
    { 'from': 'PREPARE', 'name': 'failed', 'to': 'END' },
    { 'from': 'PREPARE', 'name': 'cancelled', 'to': 'END' },
    { 'from': 'PROCESS', 'name': 'hint', 'to': 'PROCESS' },
    { 'from': 'PROCESS', 'name': 'input', 'to': 'PROCESS' },
    { 'from': 'PROCESS', 'name': 'failed', 'to': 'END' },
    { 'from': 'PROCESS', 'name': 'got_invoice_no', 'to': 'PROCESS' },
    { 'from': 'PROCESS', 'name': 'success', 'to': 'END' },
    { 'from': 'END', 'name': 'start', 'to': 'PREPARE' }
  ],
  reader: [
    { 'name': 'goto', 'from': '*', 'to': function (s) { return s } },
    { 'from': 'none', 'name': 'start', 'to': 'START' },
    { 'from': 'START', 'name': 'read', 'to': 'START' },
    { 'from': 'START', 'name': 'stop', 'to': 'none' }
  ]
}

let fsm_create = function (id, hdl = g_handler) {
  // hdl=hdl?hdl:g_handler
  hdl['refreshScoreboard'] = function () {
    let sm = this
    try {
      globalState[sm.id] = sm.state
    } catch (error) {
      log(error)
    }
    return sm
  }
  fsm[id] = new StateMachine({
    data: {
      id: id
    },
    transitions: map[id],
    methods: hdl
  })

  return fsm[id]
}

client.on('connected', function () {
  log('Connected')
  if (isRemote()) {
    process.env.NODE_DEBUG = true
    console.log('指定IP爲 ' + argv['host'])
    return
  }

  fsm_create('sys').refreshScoreboard()
  fsm_create('sess').refreshScoreboard()
  fsm_create('order').refreshScoreboard()
  fsm_create('payment').refreshScoreboard()
  fsm_create('dispense').refreshScoreboard()
  fsm_create('auth').refreshScoreboard()
  fsm_create('invoice').refreshScoreboard()
  fsm_create('reader').refreshScoreboard()

  Object.keys(map).forEach(key => {
    client.emit('publish', { e: `${key}/created` })
  })
})

client.on('message', function (message) {
  log(`Got message`)
  log(message)
  if (isRemote()) {
    return
  }
  msgQueue.push(message)
  !msgQueueFlag && innerProcess.emit('message')
})

client.on('publish', msg => {
  if (!msg) return;
  let result
  try {
    result = bizHandler(msg)
  } catch (error) {
    log(error.message)
    return
  }
  if (result) {
    if (result instanceof Array) {
      result.forEach(ele => {
        client.emit('message', ele)
      })
      return
    } else {
      client.emit('message', result)
    }
  }
})

innerProcess.on('message', function onMsg () {
  if (msgQueue.length === 0) {
    msgQueueFlag = false
    return
  }
  msgQueueFlag = true
  let msg = msgQueue.shift()

  let e = msg.e
  if (!e) return onMsg()
  let [_map, ev] = e.split('/')
    ; (function () {
      return new Promise((resolve, reject) => {
        innerProcess.on('afterFinished', () => {
          resolve()
        })
        if (_map in fsm) {
          log('reading')
          let sm = fsm[_map]
          if (ev.indexOf('goto_') === 0) {
            let to = ev.substring(5)
            resolve(sm.goto(to, msg.arg))
          } else if (sm.can(ev)) {
            sm[ev](msg.arg)
          } else {
            resolve('')
            log('can not transition by event ' + sm.id + '/' + ev + ' from ' + sm.state)
          }
        } else {
          log('invalid map:' + _map)
          resolve('')
        }
      })
    })()
      .then(res => {
        innerProcess.removeAllListeners('afterFinished')
        if (msgQueue.length) onMsg()
        else msgQueueFlag = false
      })
})

client.on('error', function (errorFrame) {
  log(errorFrame.body)
  // client.disconnect()
})

process.on('SIGINT', function () {
  client.disconnect()
  _interface.close()
  innerProcess = null
  if (!isRemote()) {
    server.close()
  }
})

/**
 * check url valid
 *
 * @param {string} path
 * @returns {{state:boolean, data:any}}
 */
function urlAnalyze (path) {
  let result
  if (path === '/') return { state: true, data: globalSess }
  if (path === '/stat') return { state: true, data: globalState }

  if (path.startsWith('/stat/')) {
    let _string = path.replace('/stat/', '').toLowerCase()
    if (globalState[_string]) {
      return {
        state: true,
        data: globalState[_string]
      }
    } else {
      return {
        state: false,
        data: 'request url is not valid'
      }
    }
  }

  try {
    let _pathArr = path.split('/').slice(1)
    _pathArr[0] = globalSess[_pathArr[0]]
    let r = _pathArr.reduce((previousValue, currentValue) => {
      return previousValue[currentValue]
    })
    if (r === undefined) throw new Error('request url is not valid')
    result = { state: true, data: r }
  } catch (error) {
    result = { state: false, data: error }
  }
  return result
}

function createSMCServer () {
  if (isRemote()) return false
  return http.createServer((request, response) => {
    let url = URL.parse(request.url)
    let result = urlAnalyze(url.pathname)
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Request-Method', '*');
    response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
    response.setHeader('Access-Control-Allow-Headers', '*');
    if (result.state) {
      if (typeof result.data === 'string') {
        response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
        response.end(result.data)
      } else {
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        response.end(JSON.stringify(result.data, null, 4))
      }
    } else {
      response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('request url is not valid')
    }
  })
}

let server = createSMCServer()

let start = function () {
  !isRemote() && server.listen(8080, () => {
    log('smc server listen on 8080')
  })
  return client.start()
}

async function readLine (line) {
  if (line === '') return _interface.prompt()
  if (line === 'state') {
    if (isRemote()) {
      globalState = await axios.get(`http://${argv['host']}/app/rest/stat.cgi`).then(res => res.data)
    }
    return console.log(globalState); _interface.prompt();
  }
  if (line === 'sess') {
    if (isRemote()) {
      try {
        globalSess = await axios.get(`http://${argv['host']}/app/rest/sess.cgi`).then(res=> res.data)
      } catch (error) {
        console.log(error)
      }
    }
    return console.log(JSON.stringify(globalSess, null, 2)); _interface.prompt();
  }
  if ((line === 'failed' || line === 'ok') && !isRemote()) {
    let sess = globalSess
    globalSess = merge.recursive(true, sess, {
      dispense: {
        mid: 'dispense_' + line
      }
    })
    console.log('Set')
    console.log(globalSess['dispense'])
    console.log('to dispense')
    return
  }
  if (line === 'help') {
    console.log('[Options]')
    console.log('state\tCheck current modules state')
    console.log('sess\tCheck current session data')
    console.log('help\tThis help')
    console.log('ok\tdispense ok simulate')
    console.log('failed\tdispense failed simulate')
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
  client.emit('message', send)
}

module.exports.start = start
module.exports.send = data => client.emit('message', data)
module.exports.stop = function () {
  client.disconnect()
  if (!isRemote()) {
    server.close()
  }
  innerProcess = null
  !module.parent && _interface.close()
}
module.exports.readLine = readLine

if (!module.parent) {
  start()
  _interface.setPrompt('smc> ')
  _interface.prompt()
  function _prompt (fn) {
    return (line) => Promise.resolve(fn(line)).then((result) => {
      if (result === 'exit') return process.emit('SIGINT')
      _interface.prompt()
    })
  }

  _interface.on('line', line => _prompt(readLine)(line))
}