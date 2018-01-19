module.exports.cbs = {
    created: function () {
        $.ebus.send(trig_chan, { 'e': 'order/start' }, conn)
    },
    enter_END: function () {
        $.ebus.send(trig_chan, { 'e': 'order/goto_MENU' }, conn);
    },
    after_ordered: function (e, from, to, arg) {
        var arg;
        var p_id = arg.p_id
        arg = { "payment_method": { "isc_alipay": { "price": 100 }, "cash": { "price": 100 } }, "p_id": p_id, "p_name": "可口可樂", "price": 100};
        $.ebus.send(trig_chan, { 'e': 'payment/hint', arg: arg }, conn);
    }
};
