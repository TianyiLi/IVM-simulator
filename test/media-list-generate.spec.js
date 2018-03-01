const media = require('../lib/media-list-generate')
const assert = require('assert')

describe('#MediaListCorrectRendering', () => {
  it('should get error when assign an empty folder', () => {
    assert.throws(()=>{
      media.getList('localhost', __dirname + '/sample-media-empty')
    }, 'No such file or directory')
  })
  it('should get list when assign a correct folder', () => {
    assert.equal(media.getList('localhost', __dirname + '/sample-media-has-file').length, 2)
  })
  it('should get list correct', () => {
    let list = [
      {
        src: 'http://localhost/media/full/test.mp4',
        desc: 'test.mp4',
        position: 'full',
        type: 'video',
        title: 'test.mp4',
        id: 0
      },
      {
        src: 'http://localhost/media/standard/test.png',
        desc: 'test.png',
        position: 'standard',
        type: 'image',
        title: 'test.png',
        id: 1,
        duration: 10
      },
    ]
    assert.deepEqual(media.getList('localhost', __dirname + '/sample-media-has-file'), list)
  })
})