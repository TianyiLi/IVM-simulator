const fs = require('fs')

/**
 * @param {string} fileName 
 */
function type (fileName) {
  let returnType = 'unknown'
  let _type = /\.([^\.]+)$/.exec(fileName)
  _type = _type[1].toLowerCase()
  if (~['mp4', 'avi', 'mov', 'm4v', 'mpg', 'webm'].indexOf(_type)) {
    returnType = 'video'
  } else if (~['jpg', 'png', 'gif'].indexOf(_type)) {
    returnType = 'image'
  }
  return returnType
}

function getList (host, mediaFolderServicePath) {
  let list = []
  let sampleFolders = fs.readdirSync(mediaFolderServicePath, { encoding: 'utf8' })
  if (!sampleFolders.length) throw new Error('No such file or directory')
  let _id = 0
  let filesList = sampleFolders.map(folder => {
    let media = fs.readdirSync(mediaFolderServicePath + '/' + folder)
    return media.map((ele) => {
      let _return = {
        src: `http://${host}/media/${folder}/${ele}`,
        desc: ele,
        position: folder,
        type: type(ele),
        title: ele,
        id: _id++
      }
      if (_return.type === 'image') {
        _return.duration = 10
      }
      return _return
    })
  }).reduce((prev, next) => prev.concat(next))
  return filesList
}

module.exports.getList = getList