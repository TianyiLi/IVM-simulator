module.exports.cbs = {
    created: function () {
        return { 'e': 'payment/start' }
    },
    after_hint: function (e, from, to, arg) {
        if (arg && arg.payment_method) {
            return { 'e': 'reader/start' }
        }
    },
    after_input: function (e, from, to, arg) {
        return { e: 'payment/hint', arg: { msg: '啟動' + arg.method } }
    },
    after_payment_begin: function (e, from, to, arg) {
        if (arg.method && arg.method !== 'cash') {
            return {
                e: 'payment/paid',
                arg: {
                    data: 'test',
                    txno: arg.txno || Math.floor(new Date().valueOf() / 1000)
                }
            }
        }
    },
    enter_TRANSACTION: function (e, from, to, arg) {
        if (arg.method !== "cash")
            return { 'e': 'payment/paid' }
    },
    after_paid: function () {
        return [
            { 'e': 'dispense/goto_none' },
            { 'e': 'dispense/start',arg: { "mid": "product_dispensing", "msg":"完成付款，商品出貨中"} }
        ]
    },
    enter_END: function () {
        return [
            { 'e': 'payment/goto_PREPARE' }
            , { 'e': 'reader/stop' }
        ]
    }
}
