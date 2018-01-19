self.ev={
    "payment_hint":function(){ var a={"payment_hint":[
        {
            "sessionId": "cd54808d37d9466eaa657f50b6b5c351",
            "qrcodeUrl": "https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=gQEo8DoAAAAAAAAAASxodHRwOi8vd2VpeGluLnFxLmNvbS9xL1BqcC1rVXJtYU5zUmtUUmFCeFNuAAIE1d73VQMECAcAAA==",
            "sessionType": "1"
        },
        {
            "sessionId": "6c772fa69b1c48849f21c19637c21ac9",
            "qrcodeUrl": "https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=gQGF8DoAAAAAAAAAASxodHRwOi8vd2VpeGluLnFxLmNvbS9xL3ZUcDhrSHJtYU5zUkk3ZFlCQlNuAAIE1d73VQMECAcAAA==",
            "sessionType": "2"
        },
        {
            "sessionId": "1f0930c7c7454d6888b65135bce54fb6",
            "qrcodeUrl": "http://chart.apis.google.com/chart?cht=qr&chs=500x500&chl=weixin%3A//wxpay/bizpayurl%3Fpr%3DiaZVoLO&chld=H|0",
            "sessionType": "3"
        }
    ]}; return a; },
    "paid":function(){
        var a={"ivmId":"00:03:2d:15:99:0e","p_id":"1","result":{"code":"010000","data":{"customerId":"19e54354-5858-11e5-9849-c0389621563a","sampling":"verify_attent"},"msg":"ok"},"sessionId":"393ea39ba27b4e928e70f854e47d866f","sessionType":"1"};
        return a;
    },
    "failed":function(){
        var a={"ivmId":"00:03:2d:15:99:0e","p_id":"1","result":{"code":"010001","data":{"customerId":"19e54354-5858-11e5-9849-c0389621563a","sampling":"verify_attent"},"msg":"expired"},"sessionId":"393ea39ba27b4e928e70f854e47d866f","sessionType":"1"};
        return a;
    }
};
