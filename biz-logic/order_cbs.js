const stock = require('../rest-sample/stock.json')
const axios = require('axios').default
let stockList = []

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
        _arg = {
            "payment_method":
                {
                    "isc_alipay": { "price": 100 },
                    "cash": { "price": 100 },
                    "easycardedc": { "price": 100 },
                    "fmsco": { price: 100}
                },
            "p_id": p_id,
            "p_name": '測試用',
            "price": 100
        };
        return [{ 'e': 'payment/goto_none' }, { 'e': 'payment/start' }, { 'e': 'payment/hint', arg: _arg }]
    }
};
