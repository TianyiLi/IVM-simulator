module.exports.cbs = {
    enter_START: function () {
        $.ebus.send(trig_chan, { 'e': 'sys/hint', 'arg': { act: 'liveview_ready' } }, conn);
    },
    leave_START: function () {
        $.ebus.send(trig_chan, { 'e': 'sys/hint', 'arg': { act: 'liveview_closed' } }, conn);
    },
    after_read: function (e, from, to, arg) {
        $.ebus.send(trig_chan, { 'e': 'reader/stop' }, conn);
        $.ebus.send(trig_chan, { 'e': 'payment/payment_begin', "arg": { "method": "isc_alipay" } }, conn);
    }
};
