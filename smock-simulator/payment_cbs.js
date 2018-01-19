self.cbs = {
    created: function () {
        $.ebus.send(trig_chan, { 'e': 'payment/start' }, conn);
    },
    after_hint: function (e, from, to, arg) {
        if (arg && arg.payment_method) {
            $.ebus.send(trig_chan, { 'e': 'reader/start' }, conn);
        }
    },
    enter_TRANSACTION: function (e, from, to, arg) {
        if (arg.method !== "cash")
            $.ebus.send(trig_chan, { 'e': 'payment/paid' }, conn);
    },
    after_paid: function () {
        if (!order) return;
        $.ebus.send(trig_chan, { 'e': 'dispense/goto_none' }, conn);
        $.ebus.send(trig_chan, { 'e': 'dispense/start' }, conn);
    },
    enter_END: function () {
        $.ebus.send(trig_chan, { 'e': 'payment/goto_PREPARE' }, conn);
        $.ebus.send(trig_chan, { 'e': 'reader/stop' }, conn);
    }
};
