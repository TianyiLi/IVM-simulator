const { StompBrokerServer } = require('../index')
const { globalSess } = require('../biz-logic/session-storage')
const smcService = require('../smc')
const axios = require('axios')
const assert = require('assert')
const stock = require('../rest-sample/stock.json')

let sleep = ms => new Promise((resolve, reject) => {setTimeout(resolve, ms)})


describe('#SMC service test', () => {
  before(async () => {
    StompBrokerServer.listen(61614, 'localhost')
    await smcService.start()
  })
  after(() => {
    smcService.stop()
    StompBrokerServer.close()
    process.exit()
  })
  describe('#Rest Service', () => {
    it('http://localhost:8080/stat should get correct response', async () => {
      let response = await axios.get('http://localhost:8080/stat')
      assert.equal(response.status, 200)
    })

    it('http://localhost:8080/ should get correct response', async () => {
      let response = await axios.get('http://localhost:8080/')
      assert.equal(response.status, 200)
    })

    it('Data can input and show on :8080/', async function ()  {
      this.timeout(2500 + 100)
      smcService.send({ e: 'order/ordered', arg: { p_id: '486' } })
      await sleep(100)
      let response = await axios.get('http://localhost:8080/order')
      let order = response.data
      assert.equal(order.p_id, '486')
      response = await axios.get('http://localhost:8080/payment')
      let price = 100
      assert.equal(response.data.price , price)
    })
    it('Payment stat should on PREPARE', async function(){
      let response = await axios.get('http://localhost:8080/stat/payment')
      let stat = response.data
      assert.equal(stat, 'PREPARE')
    })
  })
})

