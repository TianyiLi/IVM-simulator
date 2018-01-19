;(function ($) {
  function digraph (m) {
    var g = 'digraph G { '
    g += 'node [ fontname=Arial, fontcolor=black, fontsize=8 ]; '
    g += 'edge [ fontname=Helvetica, fontcolor=red, fontsize=7 ]; '
    for (var i in m) {
      e = m[i]
      g += ' ' + e.from + ' -> ' + e.to + ' [ label="' + e.name + '" ]; '
    }
    g += '}'
    return g
  }

  $.fn.make_ctrls = function () {
    var map = this.map
    var ev = this.ev
    var self = this
    $(this).find('#ctrls').empty()
    var cb = {}
    for (var i in map) {
      var t = map[i]
      var id = t.name
      if (!cb[id]) {
        cb[id] = 1
        $(this).find('#ctrls').append("<button id='cb_" + id + "'>" + id + '</button>')
        $(this).find('#cb_' + id).click(function () {
          e = $(this).text()
          var arg = null
          if (ev[e]) {
            arg = ev[e].call(self)
          }
          $.ebus.send(self.trig_chan, {'e': self.id + '/' + e,'arg': arg}, conn)
        })
      }
    }
    this.refresh_ctrls()
  }

  $.fn.refresh_ctrls = function () {
    return

    var map = this.map
    var cur = this.current

    $(this).find('#ctrls button').attr('disabled', true)
    for (var i in map) {
      var t = map[i]
      var st = t.from
      if (st != cur) continue
      var id = t.name
      $(this).find('#ctrls button#cb_' + id).attr('disabled', false)
    }
  }

  $.fn.setCurrent = function (state) {
    this.current = state
    return this
  }

  $.fn.map = function (id) {
    'use strict'
    let self = this
    if (!self.id) {
      self.id = id || $(self).attr('id')
    }
    return $.ajax({
      url: '/demo-simulator/' + self.id + '_map.json',
      cache: false,
      dataType: 'json',
      success: function (json) {
        self.map = json
        var sg = digraph(self.map)
        var ssvg = Viz(sg, 'svg')
        $(self).html('<label>' + self.id + "</label><div id='svg'></div><div id='ctrls'></div>")
        $(self).find('#svg').html(ssvg)
        $(self).css('border', '1px solid black').css('width', '500px').css('float', 'left')
        $(self).show()
        var id = self.id
        $('div#' + id).find('.node').click(function () {
          var title = $(this).find('title').first().text()
          var e = id + '/goto_' + title
          $.ebus.send(self.trig_chan, {'e': e}, conn)
        })
      }
    })
  }

  $.fn.smock = function (init) {
    let self = this
    self.current = init
    self.id = $(self).attr('id')
    self.ev = {}
    self.tran_chan = tran_chan
    self.trig_chan = trig_chan
    self.map(self.id)
      .always(function () {
        $(self).find('#svg').find('g.node').each(function () {
          if ($(this).find('title').text() != self.current) return
          $(this).find('ellipse').attr('fill', 'blue')
        // :containsExactCase('" + self.current + "')").siblings('ellipse').attr('fill', 'blue')
        })
        self.make_ctrls()
        $.ajax({
          url: '/demo-simulator/' + self.id + '_mock.js',
          cache: false,
          dataType: 'text',
          success: function (js) {
            eval(js)
            self.make_ctrls()
          }
        })
      })
    return self
  }
  $(document).ready(function () {
    var maps = {}
    
    $('body').on('ebusEvent', function (e, ebusEvent) {
      var t = ebusEvent.e.split('/')
      var map = t[0]
      var ev = t[1]
      if (ev === 'created') {
        var init = ebusEvent.init
        if ($('#map').find('#' + map).length == 0) {
          $('#map').append('<div id="' + map + '"></div>')
        }
        // alert(map+":"+ev+":"+init)
        maps[map] = $('#' + map).smock(init)
      }else if (ev === 'destroyed') {
        delete maps[map]
        $('#' + map).empty()
      }else if (ev.startsWith('enter_')) {
        $('#' + map).find('g.node').each(function () {
          if ($(this).find('title').text() == ebusEvent.to)
            $(this).find('ellipse').attr('fill', 'blue')
          else
            $(this).find('ellipse').attr('fill', 'none')
        })
        map = maps[map]
        map.setCurrent(ebusEvent.to).refresh_ctrls()
      /*            }else if(ev.startsWith('leave_')){
                      $("#"+map).find("g.node").each(function(){
                          if($(this).find("title").text()!=ebusEvent.from) return
                          $(this).find('ellipse').attr('fill', 'none')
                      });*/
      }
    })
      
  })
}(jQuery))
