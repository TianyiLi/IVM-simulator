#!/usr/local/bin/node

const conf = require('./smc_config.js')
const { StompService, stompConfig } = require('stomp-service')
const StateMachine = require('javascript-state-machine')
const merge = require('merge')
const http = require('http')
const URL = require('url')
const { EventEmitter } = require('events')

const rl = require('readline')
let _interface = rl.createInterface(process.stdin, process.stdout)
_interface.setPrompt('smc >>>')
_interface.prompt()
_interface.on('line', async line => {
  if (line === '') return _interface.prompt()
  if (line === 'state') { return console.log(globalState); _interface.prompt(); }
  if (line === 'sess') { return console.log(JSON.stringify(globalSess, null, 2)); _interface.prompt(); }
  let _line = line.split(/\s+/g)
  console.log(_line)
  let [e, arg] = _line
  let send = { e }
  try {
    let _arg = JSON.parse(arg)
    send = Object.assign(send, {arg:_arg})
  } catch (error) {
    // console.log(error)
  }
  console.log('%j', send)
  client.emit('message', send)
  _interface.prompt()
})

let globalSess = {}
let globalState = {}

let innerProcess = new EventEmitter()
let msgQueue = []
let msgQueueFlag = false

var client = new StompService()
var fsm = {}

client.configure({
  subscribe: [conf.trig_chan],
  publish: [conf.tran_chan],
  debug: false,
  path: '/stomp'
})


var g_onLeaveState = function (lc, args) {
  console.log(this.id + '/' + lc.transition + ' ' + this.id + '/leave_' + lc.from)
  var e = { e: this.id + '/leave_' + lc.from, from: lc.from, to: lc.to, on: lc.transition }
  if (args) {
    e.arg = args
    console.log('arg ' + JSON.stringify(args))
  }
  client.emit('publish', e)
}

var g_onEnterState = function (lc, args) {
  this.refreshScoreboard()
  console.log(this.id + '/' + lc.transition + ' ' + this.id + '/enter_' + lc.to)
  var e = { e: this.id + '/enter_' + lc.to, from: lc.from, to: lc.to, on: lc.transition }
  if (args) {
    e.arg = args
    console.log('arg ' + JSON.stringify(args))
  }

  client.emit('publish', e)
}

var g_onAfterEvent = function (lc, args) {
  if (lc.transition == 'goto') return
  console.log(this.id + '/' + lc.transition + ' ' + this.id + '/after_' + lc.transition)
  var e = { e: this.id + '/after_' + lc.transition, from: lc.from, to: lc.to, on: lc.transition }
  if (args) {
    e.arg = args
    console.log('arg ' + JSON.stringify(args))
  }

  client.emit('publish', e)
  innerProcess.emit('afterFinished')
}

var g_onBeforeEvent = function (lc, args) {
  var id = this.id

  if (lc.transition === 'goto') return
  console.log(this.id + '/' + lc.transition + ' ' + this.id + '/before_' + lc.transition)
  var e = { e: id + '/before_' + lc.transition, from: lc.from, to: lc.to, on: lc.transition }
  if (id === 'order' && lc.transition === 'ordered') {
    globalSess = null
    globalSess = {}
  } else if (lc.transition === 'start') {
    globalSess[id] = null
    globalSess[id] = {}
  }
  if (args) {
    e.arg = args
    console.log('arg ' + JSON.stringify(args))

    client.emit('publish', e)
    let arg = globalSess[id]
    globalSess[id] = merge.recursive(true, arg, args)
  } else {
    client.emit('publish', e)
  }
}

var g_handler = {
  onBeforeTransition: g_onBeforeEvent,
  onLeaveState: g_onLeaveState,
  onEnterState: g_onEnterState,
  onAfterTransition: g_onAfterEvent
}

var map = {
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

var fsm_create = function (id, hdl = g_handler) {
  // hdl=hdl?hdl:g_handler
  hdl['refreshScoreboard'] = function () {
    var sm = this
    try {
      globalState[sm.id] = sm.state
    } catch (error) {
      console.log(error)
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
  console.log('Connected')

  fsm_create('sys').refreshScoreboard()
  fsm_create('sess').refreshScoreboard()
  fsm_create('order').refreshScoreboard()
  fsm_create('payment').refreshScoreboard()
  fsm_create('dispense').refreshScoreboard()
  fsm_create('auth').refreshScoreboard()
  fsm_create('invoice').refreshScoreboard()
  fsm_create('reader').refreshScoreboard()
})

client.on('message', function (message) {
  console.log(`Got message`)
  console.log(message)
  msgQueue.push(message)
  !msgQueueFlag && innerProcess.emit('message')
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
          console.log('reading')
          let sm = fsm[_map]
          if (ev.indexOf('goto_') === 0) {
            var to = ev.substring(5)
            resolve(sm.goto(to, msg.arg))
          } else if (sm.can(ev)) {
            sm[ev](msg.arg)
          } else {
            resolve('')
            console.log('can not transition by event ' + sm.id + '/' + ev + ' from ' + sm.state)
          }
        } else {
          console.log('invalid map:' + _map)
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
  console.log(errorFrame.body)
  client.disconnect()
})

process.on('SIGINT', function () {
  client.disconnect()
  server.close()
  _interface.close()
  innerProcess = null
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

let server = http.createServer((request, response) => {
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

server.listen(8080, () => {
  console.log('smc server listen on 8080')
})
client.start()