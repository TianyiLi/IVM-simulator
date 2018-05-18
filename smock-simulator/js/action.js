; (function (self, $) {
  'use strict'
  let disabled = true;
  let timeStamp = function () { return Math.floor(new Date().valueOf() / 1000) }
  let events = [
    { event: "sys/sys_suspended", desc: "暫停服務", arg: '{"msg":"產品已售完，暫時停止服務"}' },
    { event: "sys/sys_op", desc: "開始營運", arg: '{}', disabled },
    { event: "sess/timeout", desc: "閒置", arg: '{}', disabled },
    { event: "sess/session_begin", desc: "開始Session", arg: '{}', disabled },
    { event: "order/ordered", desc: "點菜p_id", arg: '{"p_id":"130"}' },
    { event: "payment/hint", desc: "支付提示", arg: '{"payment_method":{"cash":{"price":10},"easycardedc":{"price":8},"ipass":{"price":6},"isc_moneycoin":{"price":10},"isc_linepay":{"price":10}},"p_id":3,"p_name":"可口可樂","chid":"0A1"}' },
    { event: "sys/hint", desc: "開啟liveview", arg: '{"act":"liveview_ready"}' },
    { event: "sys/hint", desc: "關閉liveview", arg: '{"act":"liveview_closed"}' },
    { event: "payment/input", desc: "指定使用悠遊卡", arg: '{"method":"easycardedc", "mid":"payment_wait_easycardedc"}' },
    { event: "payment/payment_begin", desc: "投入第1個硬幣", arg: '{"paid":10, "method":"cash", "txno":' + timeStamp() + '}' },
    { event: "payment/payment_begin", desc: "感應靠卡(悠遊卡)", arg: '{"paid":10, "method":"easycardedc", "txno":' + timeStamp() + '}' },
    { event: "payment/payment_begin", desc: "鏡頭掃碼(任意)", arg: '{"paid":10, "method":"isc_anycode", "txno":' + timeStamp() + '}' },
    { event: "payment/hint", desc: "繼續投入硬幣", arg: '{"paid":20, "method":"cash"}' },
    { event: "reader/read", desc: "鏡頭掃碼成功", arg: '{"data":"test"}' },
    { event: "payment/paid", desc: "交易完成", arg: '{"paid":100,"txno":' + timeStamp() + '}' },
    { event: "payment/failed", desc: "支付錯誤", arg: '{"msg":"支付錯誤(305)"}' },
    { event: "dispense/prod_dispensed", desc: "出貨成功", arg: '{"mid":"dispense_ok","msg":"ok:付货正常:00000001:00000001"}' },
    { event: "dispense/failed", desc: "出貨失敗", arg: '{"mid":"dispense_failed","msg":"failed:付货失败:01011101:00000000"}' },
    { event: "invoice/hint", desc: "統一編號", arg: '{"invoice_unino":false,"msg":"是否輸入統一編號？", "mid":"q_input_unino"}' },
    { event: "invoice/hint", desc: "統一編號", arg: '{"invoice_receipt":false,"msg":"是否列印明細？", "mid":"q_print_receipt"}' },
    { event: "invoice/hint", desc: "收據列印中", arg: '{"type":"info","mid":"receipt_printing","msg":"receipt_printing"}' },
    { event: "invoice/success", desc: "收據列印成功", arg: '{"type":"info","mid":"receipt_printed","msg":"receipt_printed"}' }
  ], _$table = $('#select-button')

  events.map(function (ele) {
    $(`<tr>
        <td><button trig="${ele.event}">${ele.event}</button></td>
        <td><label>${ele.desc}</label></td>
        <td><input type="text" value='${ele.arg}' ${'disabled' in ele ? 'disabled' : ''}></td>
      </tr>`).appendTo(_$table)

  })
})(window, jQuery);
