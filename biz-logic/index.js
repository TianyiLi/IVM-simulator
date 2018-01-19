const { StompService } = require('stomp-service')
const stompService = new StompService()
// modules callback
let biz = {
  auth : require('./auth_cbs').cbs,
  dispense : require('./dispense_cbs').cbs,
  invoice : require('./invoice_cbs').cbs,
  order : require('./order_cbs').cbs,
  payment : require('./payment_cbs').cbs,
  reader : require('./reader_cbs').cbs,
  sess : require('./sess_cbs').cbs,
  sys : require('./sys_cbs').cbs,
}

stompService.configure({
  host:'0.0.0.0',
  port:61614,
  path:'/stomp',
  subscribe:['/topic/app'],
  publish: ['/queue/app']
})

stompService.on('message', (msg)=>{
  let event = msg.e.split('/')
  if (biz[event[0]] && biz[event[0]][event[1]]) {
    let { e, from, to, arg } = msg
    biz[event[0]][event[1]](e, from, to, arg)
  }
})

module.exports.start = function(){
  return stompService.start()
}

module.exports.stop = function(){
  return stompService.disconnect()
}

if (!module.parent) {
  stompService.start()
  function processExit() {
    stompService.disconnect()
  }
  process.on('SIGINT', ()=>processExit())
  process.on('beforeExit', ()=>processExit())
}