const stock = require('../rest-sample/stock.json')
module.exports.cbs = {
    created: function () {
        return { 'e': 'order/start' }
    },
    enter_END: function () {
        return { 'e': 'order/goto_MENU' }
    },
    after_ordered: function (e, from, to, arg) {
        let _arg;
        let p_id = arg.p_id
        let product = stock.find(ele => ele.id == p_id)
        _arg = {
            "payment_method":
                {
                    "isc_alipay": { "price": product.price },
                    "cash": { "price": product.price },
                    "easycardedc": { "price": product.price }
                },
            "p_id": p_id,
            "p_name": product.name,
            "price": product.price
        };
        return [{ 'e': 'payment/goto_none' }, { 'e': 'payment/start' }, { 'e': 'payment/hint', arg: _arg }]
    }
};
