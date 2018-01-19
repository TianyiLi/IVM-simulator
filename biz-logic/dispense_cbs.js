module.exports.cbs = {
    enter_PREPARE: function () {
        $.ebus.send(trig_chan, { 'e': 'dispense/ready' }, conn);
    },
    enter_END: function () {
        $.ebus.send(trig_chan, { 'e': 'dispense/goto_none' }, conn);
    }
};
