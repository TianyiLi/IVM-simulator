const product = require('../lib/products-list-generate')
const assert = require('assert')

describe('#Product relative List rendering correct', () => {
  describe('Stock list relative', function () {
    let stockList = []
    it('should return an empty array when assign an empty folder', () => {
      assert.deepEqual(product.getStockList('localhost', __dirname + '/sample-media-empty'), [])
    })
    it('should get stock list when assign a correct folder', () => {
      stockList = product.getStockList('localhost', __dirname + '/sample-product-has-file')
      assert.equal(stockList.length, 1)
    })
    it('should get list correct', () => {
      let list = [
        {
          dm: `http://localhost/products/test.png`,
          name: '測試用',
          img: `http://localhost/products/test.png`,
          s: 0,
          desc: '測試用',
          id: 0,
          title: '測試用',
          price: 100,
          soldout: false,
          en_us_name: 'test',
          en_us_description: 'test'
        }
      ]
      assert.deepEqual(stockList, list)
    })
    it('This one soldout shoud be true', () => {
      stockList = product.getStockList('localhost', __dirname + '/sample-product-has-file')
      let list = [
        {
          dm: `http://localhost/products/test.png`,
          name: '測試用',
          img: `http://localhost/products/test.png`,
          s: 0,
          desc: '測試用',
          id: 0,
          title: '測試用',
          price: 100,
          soldout: true,
          en_us_name: 'test',
          en_us_description: 'test'
        }
      ]
      assert.deepEqual(stockList, list)
    })
  })
  describe('ChannelList relative', function () {
    let channelList = []
    it('should return an empty array when assign an empty folder', () => {
      let list = product.getChannelList('localhost', __dirname + '/sample-media-empty')
      assert.deepEqual(product.getChannelList('localhost', __dirname + '/sample-media-empty'), [])
    })
    it('should get channel list when assign a correct folder', () => {
      channelList = product.getChannelList('localhost', __dirname + '/sample-product-has-file')
      assert.equal(channelList.length, 1)
    })
    it('should be able to assign list length', () => {
      assert.equal(product.getChannelList('localhost', __dirname + '/sample-product-has-file', 30).length, 30)
    })
    it('should get list correct', () => {
      let list = {
        dm: `http://localhost/products/test.png`,
        chid: '0A1',
        max: 10,
        quantity: 0,
        name: '測試用',
        img: `http://localhost/products/test.png`,
        chno: '0',
        desc: 'test',
        price: 100,
        id: 0,
        title: '測試用',
        en_us_name: 'test',
        en_us_description: 'test'
      }
      assert.equal()
    })
  })
})