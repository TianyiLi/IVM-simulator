module.exports.cbs = {
    enter_START: function () {
        return { 'e': 'sys/hint', 'arg': { act: 'liveview_ready' } }
    },
    leave_START: function () {
        return { 'e': 'sys/hint', 'arg': { act: 'liveview_closed' } }
    },
    after_read: function (e, from, to, arg) {
        return [
            { 'e': 'reader/stop' },
            { 'e': 'payment/payment_begin', "arg": { "method": "isc_alipay" } }
        ]
    }
};
