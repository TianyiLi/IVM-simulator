module.exports.cbs = {
    created: function () {
        return { 'e': 'sess/goto_SESSION' }
    },
    session_begin: function () {
        return [{
            'e': 'order/goto_none'
        },
        {
            'e': 'order/start'
        }]
    }
};
