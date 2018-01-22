module.exports.cbs = {
    created: function () {
        return { 'e': 'payment/start' }
    },
    after_hint: function (e, from, to, arg) {
        if (arg && arg.payment_method) {
            return { 'e': 'reader/start' }
        }
    },
    enter_TRANSACTION: function (e, from, to, arg) {
        if (arg.method !== "cash")
            return { 'e': 'payment/paid' }
    },
    after_paid: function () {
        return [{ 'e': 'dispense/goto_none' },
        { 'e': 'dispense/start' }]
    },
    enter_END: function () {
        return [{ 'e': 'payment/goto_PREPARE' }
        , { 'e': 'reader/stop' }]
    }
}
