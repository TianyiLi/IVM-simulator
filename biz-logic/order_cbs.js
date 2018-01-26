const stock = require('../rest-sample/stock.json')
module.exports.cbs = {
    created: function () {
        return { 'e': 'order/start' }
    },
    enter_END: function () {
        return { 'e': 'order/goto_MENU' }
    },
    after_ordered: function (e, from, to, arg) {
        console.log(arguments)
        let _arg;
        let p_id = arg.p_id
        let product = stock.find(ele => ele.id == p_id)
        console.log(product)
        console.log(stock)
        _arg = {
            "payment_method":
                {
                    "isc_alipay": { "price": 100 },
                    "cash": { "price": 100 }
                },
            "p_id": p_id,
            "p_name": product.name,
            "price": 100
        };
        return { 'e': 'payment/hint', arg: _arg }
    }
};
