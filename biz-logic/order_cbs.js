module.exports.cbs = {
    created: function () {
        return { 'e': 'order/start' }
    },
    enter_END: function () {
        return { 'e': 'order/goto_MENU' }
    },
    after_ordered: function (e, from, to, arg) {
        console.log(arguments)
        var arg;
        var p_id = arg.p_id
        arg = { "payment_method": { "isc_alipay": { "price": 100 }, "cash": { "price": 100 } }, "p_id": p_id, "p_name": "可口可樂", "price": 100};
        return { 'e': 'payment/hint', arg: arg }
    }
};
