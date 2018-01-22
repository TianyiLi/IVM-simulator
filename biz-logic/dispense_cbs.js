
module.exports.cbs = {
    enter_PREPARE: function () {
        return { 'e': 'dispense/ready' }
    },
    enter_END: function () {
        return { 'e': 'dispense/goto_none' }
    }
};
