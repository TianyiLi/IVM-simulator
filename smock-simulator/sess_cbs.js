self.cbs = {
    created: function () {
        $.ebus.send(trig_chan, { 'e': 'sess/goto_SESSION' }, conn);
    }
};
