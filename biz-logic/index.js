// modules callback
let biz = {
  auth: require('./auth_cbs').cbs,
  dispense: require('./dispense_cbs').cbs,
  invoice: require('./invoice_cbs').cbs,
  order: require('./order_cbs').cbs,
  payment: require('./payment_cbs').cbs,
  reader: require('./reader_cbs').cbs,
  sess: require('./sess_cbs').cbs,
  sys: require('./sys_cbs').cbs,
}
module.exports.bizHandler = function (msg) {
  let event = msg.e.split('/')
  if (biz[event[0]] && biz[event[0]][event[1]]) {
    let { e, from, to, arg } = msg
    return biz[event[0]][event[1]](e, from, to, arg)
  }
}