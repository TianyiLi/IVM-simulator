; (function (self, $) {
  'use strict'
  let events = [
    { event: "sys/sys_suspended", desc: "暫停服務", arg: '{"msg":"產品已售完，暫時停止服務"}' },
    { event: "order/ordered", desc: "點菜p_id", arg: '{"p_id":130}' },
    { event: "payment/hint", desc: "支付提示", arg: '{"payment_method":{"cash":{"price":10},"easycardedc":{"price":8},"ipass":{"price":6},"isc_moneycoin":{"price":10},"isc_linepay":{"price":10}},"p_id":3,"p_name":"可口可樂","chid":"0A1"}' },
    { event: "sys/hint", desc: "開啟liveview", arg: '{"act":"liveview_ready"}' },
    { event: "sys/hint", desc: "關閉liveview", arg: '{"act":"liveview_closed"}' },
    { event: "payment/payment_begin", desc: "投入第1個硬幣", arg: '{"paid":10, "method":"cash"}' },
    { event: "payment/hint", desc: "繼續投入硬幣", arg: '{"paid":20, "method":"cash"}' },
    { event: "reader/read", desc: "鏡頭掃碼成功", arg: '{"paid":100, "method":"isc_alipay"}' },
    { event: "payment/paid", desc: "交易完成", arg: '{"paid":100,"txno":' + new Date().valueOf() + '}' },
    { event: "payment/failed", desc: "支付錯誤", arg: '{"msg":"支付錯誤(305)"}' },
    { event: "dispense/start", desc: "開始出貨", arg: '{"msg":"完成付款，商品出貨中"}' },
    { event: "dispense/prod_dispensed", desc: "出貨成功", arg: '{"mid":"dispense_ok","msg":"ok:付货正常:00000001:00000001","elapsed":9}' }
  ], _$table = $('#select-button')

  events.map(function (ele) {
    $(`<tr>
        <td><button trig="${ele.event}">${ele.event}</button></td>
        <td><label>${ele.desc}</label></td>
        <td><input type="text" value='${ele.arg}'></td>
      </tr>`).appendTo(_$table)
    
  })
})(window, jQuery);
