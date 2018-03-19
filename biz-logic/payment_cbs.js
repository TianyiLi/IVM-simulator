let price = 0,
    method = undefined

module.exports.cbs = {
    created: function () {
        return { 'e': 'payment/start' }
    },
    after_hint: function (e, from, to, arg) {
        if (arg && arg.payment_method) {
            price = arg.price
            return { 'e': 'reader/start' }
        }
        if (from === 'TRANSACTION') {
            if (arg && arg.paid >= price) {
                return {
                    e: 'payment/paid',
                    arg: {
                        data: 'test',
                        txno: arg.txno
                    }
                }
            }
        }
    },
    after_input: function (e, from, to, arg) {
        return { e: 'payment/hint', arg: { man_payment_method: arg.payment_method } }
        // return [{ e: 'payment/payment_begin', arg: { msg: '啟動' + arg.payment_method, method: arg.payment_method } }]
    },
    after_payment_begin: function (e, from, to, arg) {
        // When user use /demo to simulate, this one seems not necessary.
        // if (arg.method && arg.method !== 'cash') {
        //     return {
        //         e: 'payment/paid',
        //         arg: {
        //             data: 'test',
        //             txno: arg.txno || Math.floor(new Date().valueOf() / 1000)
        //         }
        //     }
        // }
        method = arg.method
        return { e: 'reader/stop' }
    },
    enter_TRANSACTION: function (e, from, to, arg) {
        // if (arg.method !== "cash")
        //     return { 'e': 'payment/paid' }
    },
    after_paid: function () {
        return [
            { 'e': 'dispense/goto_none' },
            { 'e': 'dispense/start', arg: { "mid": "product_dispensing", "msg": "完成付款，商品出貨中" } }
        ]
    },
    enter_END: function () {
        return [
            { 'e': 'payment/goto_PREPARE' }
            , { 'e': 'reader/stop' }
        ]
    },
    after_start: function () {
        price = 0
    }
}
