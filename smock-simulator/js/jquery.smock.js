; (function ($) {
  'use strict'

  function digraph (m) {
    let g = 'digraph G { '
    g += 'node [ fontname=Arial, fontcolor=black, fontsize=8 ]; '
    g += 'edge [ fontname=Helvetica, fontcolor=red, fontsize=7 ]; '
    for (let i in m) {
      let e = m[i]
      g += ' ' + e.from + ' -> ' + e.to + ' [ label="' + e.name + '" ]; '
    }
    g += '}'
    return g
  }

  $.fn.make_ctrls = function () {
    let map = this.map
    let ev = this.ev
    let self = this
    $(this).find('#ctrls').empty()
    let cb = {}
    for (let i in map) {
      let t = map[i]
      let id = t.name
      if (!cb[id]) {
        cb[id] = 1
        $(this).find('#ctrls').append("<button id='cb_" + id + "'>" + id + '</button>')
        $(this).find('#cb_' + id).click(function () {
          let e = $(this).text()
          let arg = null
          if (ev[e]) {
            arg = ev[e].call(self)
          }
          $.ebus.send(self.trig_chan, { 'e': self.id + '/' + e, 'arg': arg }, conn)
        })
      }
    }
    this.refresh_ctrls()
  }

  $.fn.refresh_ctrls = function () {
    return

    let map = this.map
    let cur = this.current

    $(this).find('#ctrls button').attr('disabled', true)
    for (let i in map) {
      let t = map[i]
      let st = t.from
      if (st != cur) continue
      let id = t.name
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
        console.log(json)
        let sg = digraph(self.map)
        let ssvg = Viz(sg, 'svg')
        $(self).html('<label>' + self.id + "</label><div id='svg'></div><div id='ctrls'></div>")
        $(self).find('#svg').html(ssvg)
        $(self).css('border', '1px solid black').css('width', '500px').css('float', 'left')
        $(self).show()
        let id = self.id
        $('div#' + id).find('.node').click(function () {
          let title = $(this).find('title').first().text()
          let e = id + '/goto_' + title
          $.ebus.send(self.trig_chan, { 'e': e }, conn)
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
    let maps = {}
    $.getJSON('http://' + window.location.hostname + ':8080/stat', function (stat) {
      console.log(stat)
      Object.keys(stat).forEach(function (key) {
        console.log(key)
        maps[key] = $('<div id="' + key + '"></div>').appendTo($('#map')).smock(stat[key])
      })
    });
    $('body').on('ebusEvent', function (e, ebusEvent) {
      let t = ebusEvent.e.split('/')
      let map = t[0]
      let ev = t[1]
      if (ev === 'created') {
        var init = ebusEvent.init
        if ($('#map').find('#' + map).length == 0) {
          $('#map').append('<div id="' + map + '"></div>')
        }
        maps[map] = $('#' + map).smock(init)
      } else if (ev === 'destroyed') {
        delete maps[map]
        $('#' + map).empty()
      } else if (ev.startsWith('enter_')) {
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
