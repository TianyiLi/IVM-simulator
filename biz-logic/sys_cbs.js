module.exports.cbs={
    created:function(){
        $.ebus.send(SMC.trig_chan,{'e':'sys/start'},conn);
    }
};
