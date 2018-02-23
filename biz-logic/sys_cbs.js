module.exports.cbs = {
  created () {
    return [{ e: 'sys/start' }, { e: 'sys/sys_op' }]
  },
  after_start () {
    return [{ e: 'sys/sys_op' }, {e:'payment/goto_none'}]
  }
};
