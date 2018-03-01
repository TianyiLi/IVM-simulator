/// <reference path="../node_modules/@types/mocha/index.d.ts" />
const server = require('../index')
const axios = require('axios')
const assert = require('assert')
const { StompService, stompConfig } = require('stomp-service')
const merge = require('merge')
let client = new StompService()
let client2 = new StompService()

before(async function () {
  server.config.open = false
  server.config.port = 8001
  server.config.logLevel = 0
  server.SamplerServer.start(server.config)
  server.StompBrokerServer.listen(61614, 'localhost')
  let config = stompConfig,
    config2 = merge(true, stompConfig)
  config.path = '/stomp'
  config.subscribe = ['/topic/app.test']
  config.publish = ['/queue/app.test']
  client.configure(config)
  config2.subscribe = ['/queue/app.test']
  config2.publish = ['/topic/app.test']
  config2.path = '/stomp'
  client2.configure(config2)
  await client2.start()
})

after(() => {
  client.disconnect()
  client2.disconnect()
  server.close()
})
describe('#SampleServer test', () => {
  describe('#Live Server mounting Test', () => {
    it('/app/rest/media.cgi should get response 200', done => {
      axios.get('http://localhost:8001/app/rest/media.cgi')
        .then(response => {
          assert.equal(response.status, 200)
          done()
        })
    })
    it('/app/rest/stock.cgi should get response 200', done => {
      axios.get('http://localhost:8001/app/rest/stock.cgi')
        .then(response => {
          assert.equal(response.status, 200)
          done()
        })
    })
    it('/app/rest/channel.cgi should get response 200', done => {
      axios.get('http://localhost:8001/app/rest/channel.cgi')
        .then(response => {
          assert.equal(response.status, 200)
          done()
        })
    })
    it('/app/rest/sys.cgi should get response 200', done => {
      axios.get('http://localhost:8001/app/rest/sys.cgi')
        .then(response => {
          assert.equal(response.status, 200)
          done()
        })
    })
  })

  describe('#StompBroker Test', ()=>{
    it('Service should emit connected when connection established', done => {
      client.once('connected', () => done())
      client.start()
    })
    it('Service state should on connected', () => {
      let state = client.status()
      assert.equal(state, 1)
    })
    it('Service should receive a message which from client2', done => {
      client.once('message', msg => done())
      client2.emit('publish', { e: 'test' })
    })
  })
})
