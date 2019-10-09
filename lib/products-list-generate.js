const fs = require('fs')
const path = require('path')

const NAME_TEXT = '測試用'
const EN_US_NAME = 'test'
const EN_US_DESCRIPTION = 'test'

let repeatWord = (length = 1) => _char => Array.from({ length }, e => _char).join('')
let range = (length = 1, start = 0) => Array.from({ length }, (_, i) => i + start)
let zeroAdd = (length = 1, str = '') => (repeatWord(length)('0') + str).slice(length * -1)

let isSoldoutCounter = 0

function getStockList (host, productsFolderServicePath, nums = 20) {
  let list = []
  let sampleFolders = fs.readdirSync(productsFolderServicePath, { encoding: 'utf8' })
  if (sampleFolders.length === 1) {
    if (nums > 1) {
      let clone = [...sampleFolders]
      while(sampleFolders.length < nums) {
        sampleFolders = sampleFolders.concat([...clone])
      }
    }
  }
  list = sampleFolders.map((ele, index) => {
    return {
      dm: `http://${host}/products/${ele}`,
      name: NAME_TEXT,
      img: `http://${host}/products/${ele}`,
      s: index,
      desc: NAME_TEXT,
      id: index,
      title: NAME_TEXT,
      price: 100,
      soldout: !!(((index) + isSoldoutCounter) % 2),
      en_us_name: EN_US_NAME,
      en_us_description: EN_US_DESCRIPTION
    }
  })
  isSoldoutCounter++
  return list
}
/**
 * chno設定，最多6櫃  每櫃貨道6層滿，一層最多可設定10道，共可以設定 6 * 6 * 10 = 360個單位品項
 * @param {number} chnoLength 
 */
function getChno (chnoLength) {
  const channelPrefix = ['A', 'B', 'C', 'D', 'E', 'F']
  let _id = 0, ctnId = 0
  let layer = ~~(chnoLength / 10)
  let containers = range(layer).map(ele => {
    ctnId = ~~((_id++) / 6)
    return range(10).map(num => `${ctnId}${channelPrefix[ele % 6]}${(num + 1) % 10}`)
  })
  chnoLength % 10 > 0 && containers.push(range(chnoLength % 10).map(num => `${(layer) % 6 === 0 && ctnId + 1 || ctnId}${channelPrefix[(layer) % 6]}${(num + 1) % 10}`))
  return containers.reduce((prev, next) => prev.concat(next))
}



function getChannelList (host, productsFolderServicePath, length = -1) {
  let sampleProductFiles = fs.readdirSync(productsFolderServicePath, { encoding: 'utf8' })
  let _typeRegex = /\.([^\.]+)$/
  if (!sampleProductFiles.length) return []
  sampleProductFiles = sampleProductFiles.filter(file => {
    let _type = _typeRegex.exec(file)[1].toLowerCase()
    return !!~['jpg', 'png', 'gif'].indexOf(_type)
  })

  let channel = getChno(!~length && sampleProductFiles.length || length)
  return channel.map((chno, index) => {
    return {
      dm: `http://${host}/products/${sampleProductFiles[index % sampleProductFiles.length]}`,
      chid: chno,
      max: 10,
      quantity: index % 11,
      name: NAME_TEXT,
      img: `http://${host}/products/${sampleProductFiles[index % sampleProductFiles.length]}`,
      chno: `${parseInt(chno, 16)}`,
      desc: 'test',
      price: 100,
      id: index,
      title: NAME_TEXT,
      en_us_name: EN_US_NAME,
      en_us_description: EN_US_DESCRIPTION
    }
  })
}

module.exports.getStockList = getStockList
module.exports.getChannelList = getChannelList