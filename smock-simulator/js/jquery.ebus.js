(function($){
	
	$.fn.extend({
		/**
		 * 處理 EBusEvent
		 * @param {Object} ebusEvent過濾器
		 * @param {Function} ebusEvent處理程序
		 */
		ebusEvent: function(filter, fn){
			return this.each(function(){
				if(!fn){
					console.log('no function specified');
					return;
				}
				$(this)
				.data('ebusEventFilter',filter)
				.on('ebusEvent',fn);				
			});
		}
	});	
	
	$.ebus = {
		/**
		 * 建立 ebus 連線
 		 * @param {Object} params 連線參數
 		 * {
 		 *  ip:'',
 		 *  port:61614,
 		 *  user:'user',
 		 *  password:'password',
 		 *  heartbeat: 180000,
 		 *  autoconnect: true,
 		 *  autointerval: 3000,
 		 *  subscribe:[
 		 *              "channel",
 		 *            ]
 		 * }
 		 * @param successFn 連線成功時的 callback;會傳入此連線的物件
 		 * @param errorFn 斷線時的 callback
 		 * @return connection ebus連線物件
		 */
		connect: function(params, successFn, errorFn){
			if(!params)
				params={};
			var ip = params.ip?params.ip:$.ebus.getIp();
			var port = params.port?params.port:61614;
			var user = params.user?params.user:'user';
			var password = params.password?params.password:'password';
			var heartbeat = params.heartbeat?params.heartbeat:180000;
			var isAutoConn = params.autoconnect!=null?params.autoconnect:true;
			var autoConnInterval = params.autointerval!=null?params.autointerval:3000;
			var client = Stomp.client('ws://'+ip+':'+port+'/stomp');
			if(heartbeat>=300000)
				heartbeat=280000;
			client.heartbeat.incoming=heartbeat;
			client.heartbeat.outgoing=heartbeat;
			
			//metadata for reconnect
			client.meta={};
			client.meta.ip = ip;
			client.meta.port = port;
			client.meta.user = user;
			client.meta.password = password;
			client.meta.autoconnect = isAutoConn;
			client.meta.autointerval = autoConnInterval;
			client.meta.heartbeat = heartbeat;
			client.meta.subscribe = params.subscribe.slice();
			client.meta.success = successFn;
			client.meta.error = errorFn;

			if($.ebus.isSameOrigin(ip)){
				delete $.ebus._sameOriginConn;
				$.ebus._sameOriginConn = client;
			}
			
			console.log('ws://'+ip+':'+port+'/stomp');
			console.log(client);
			client.connect(
				user,
				password,
				function(){
					console.log('connection ok');
					//start heartbeat timer
					var timerId=window.setInterval(
						function(){
							$.ebus.send(
								'/topic/heartbeat',
								{
									//heartbeat content
								},
								client
							);
						},
						heartbeat
					);
					$.ebus._timers[client]=timerId;
					console.log('heartbeat id='+timerId+' started');
					//subscribe
					if(params.subscribe){
						for(var i=0;i<params.subscribe.length;i++){
							var chann = params.subscribe[i];
							$.ebus.subscribe(chann, client);
						}
					}
					if(successFn){
						successFn(client);
					}
				},
				function(error){
					console.log('error: '+error);
					//unsubscribe
					for(var i=0;i<client.meta.subscribe.length;i++){
						var sub = client.meta.subscribe[i];
						console.log("clean cache "+sub);
						delete $.ebus._channels[sub];
					}
					//stop heartbeat timer
					window.clearInterval($.ebus._timers[client]);
					if(errorFn)
						errorFn(error);
					//auto reconnect
					var param = {
						ip:client.meta.ip,
						port:client.meta.port,
						user:client.meta.user,
						password:client.meta.password,
						heartbeat:client.meta.heartbeat,
						autoconnect:client.meta.autoconnect,
						autointerval:client.meta.autointerval,
						subscribe:client.meta.subscribe.slice()
					};
					var successFn = client.meta.success;
					var errorFn = client.meta.error;
					if(isAutoConn){
						console.log('auto reconnect');
						window.setTimeout(
							function(){
								$.ebus.connect(param,successFn,errorFn)
							},
							autoConnInterval
						);
					}
				});
			return client;
		},
		/**
		 * 中斷 ebus 連線
		 * @param {Object} conn ebus連線物件
		 */
		disconnect: function(conn){
			if(typeof conn == 'undefined'){
				conn = $.ebus._sameOriginConn;
			}
			if(!conn){
				console.log('null connection');
				return;
			}
			var timerId = $.ebus._timers[conn];
			window.clearInterval(timerId);
			console.log('heartbeat id='+timerId+' stopped');
			conn.disconnect();
			console.log('disconnected');
		},
		/**
		 * 監聽 ebus 頻道
		 * @param {Object} channel ebus頻道
		 * @param {Object} conn ebus連線物件
		 */
		subscribe: function(channel,conn){
			console.log('subscribe channel='+channel);
			if(!channel.startWith('/topic/') && !channel.startWith('/queue/'))
				return -1;
			if($.ebus._channels.hasOwnProperty(channel))
				return $.ebus._channels[channel];
			if(typeof conn == 'undefined'){
				conn = $.ebus._sameOriginConn;
			}
			if(!conn){
				console.log('null connection');
				return -1;
			}
			var id=conn.subscribe(channel, $.ebus._mqhandler);
			$.ebus._channels[channel]=id;
			console.log("subscribe="+channel+' id='+id);
			return id;
		},
		/**
		 * 取消監聽 ebus 頻道
		 * @param {Object} channel ebus頻道
		 * @param {Object} conn ebus連線物件
		 * @return {Boolean} 是否成功
		 */
		unsubscribe: function(channel,conn){
			console.log('unsubscribe channel='+channel);
			if(!$.ebus._channels.hasOwnProperty(channel))
				return false;
			if(typeof conn == 'undefined'){
				conn = $.ebus._sameOriginConn;
			}
			if(!conn){
				console.log('null connection');
				return false;
			}
			conn.unsubscribe($.ebus._channels[channel]);
			delete $.ebus._channels[channel];
			console.log("unsubscribe "+channel);
			return true;
		},
		/**
		 * 推送訊息至 ebus 頻道
		 * @param {Object} channel ebus頻道
		 * @param {Object} obj Javascript物件
		 * @param {Object} conn ebus連線物件
		 * obj 將被轉換為 json string 做為推送之訊息
		 */
		send: function(channel,obj,conn){
			console.log('channel='+channel);
			console.log(obj);
			if(typeof conn == 'undefined'){
				conn = $.ebus._sameOriginConn;
			}
			if(!conn){
				console.log('null connection');
				return;
			}
			console.log('send to '+conn.meta.ip);
			conn.send(
				channel,
				{
					priority : 9
				},
				JSON.stringify(obj)
			);
		},
		/**
		 * 查詢是否ebus已連線
		 * @param conn ebus連線物件
		 */
		isConnected: function(conn){
			if(typeof conn == 'undefined'){
				conn = $.ebus._sameOriginConn;
			}
			if(!conn){
				console.log('null connection');
				return false;
			}
			return conn.connected;
		},
		/**
		 * 取得網頁的來源 IP
		 */
		getIp: function(){
			var url=window.location.href;
			var tokens=url.match(/^https?:\/\/([^/:]+)/);
			if(tokens && tokens.length==2)
				return tokens[1];
			return '127.0.0.1';
		},
		/**
		 * 控制 ebus 與 dbus 的(Signal)信號連結
		 * 使 ebus 自動轉換 dbus signals 為 ebusEvent 並進行推送
		 */
		dbus: {
			bind: function(iface, signal){
				console.log('ebus.dbus.bind iface='+iface+' signal='+signal);
				$.daas.call(
					'com.transtep.ebus',
					'/com/transtep/ebus',
					'com.transtep.ebus',
					'bind',
					[iface, signal],
					true
				);
			},
			unbind: function(iface, signal){
				console.log('ebus.dbus.unbind iface='+iface+' signal'+signal);
				$.daas.call(
					'com.transtep.ebus',
					'/com/transtep/ebus',
					'com.transtep.ebus',
					'unbind',
					[iface, signal],
					true
				);
			},
			list: function(){
				console.log('ebus.dbus.list');
				return $.daas.call(
					'com.transtep.ebus',
					'/com/transtep/ebus',
					'com.transtep.ebus',
					'list',
					[]
				);				
			}	
		},
		/**
		 * 檢查URL是否與browser同源
		 * @param url
		 */
		isSameOrigin: function(url){
			var origin='127.0.0.1';
			var href=window.location.href;
			var tokens=href.match(/^https?:\/\/([^/:]+)/);
			if(tokens && tokens.length==2)
				origin=tokens[1];
			if(origin=='localhost')
				origin='127.0.0.1';
			if(url=='localhost')
				url='127.0.0.1';
			console.log('url='+url+' origin='+origin);
			return url==origin;
		},
		/**
		 * 開啟 ebus 連線的DEBUG訊息
		 * @param conn ebus連線物件
		 */
		debug: function(conn){
			if(typeof conn == 'undefined'){
				conn = $.ebus._sameOriginConn;
			}
			if(!conn){
				console.log('null connection');
				return;
			}
			conn.debug = function(msg){
				console.log(msg);
			}
		},
		_channels:{},
		_timers:{},
		_sameOriginConn:null,
		_mqhandler: function(message){
            var chan=message.headers.destination;
			if(message.body) {
				var obj=null;
				try{
					obj = $.parseJSON(message.body);
				}catch(e){
					obj = {
						'message':message.body,
					};
				}
				$('.ebus-listener')
				.add(document)
				.add(window)
				.each(function(){
					var filter=$(this).data('ebusEventFilter');
					var isOk=true;
					if(filter){
						for(var key in filter){
							var value = filter[key];
							if(obj[key]!=value){
								isOk=false;
								break;
							}
						}
					}
					if(isOk){
                        obj.chan=chan;
						$(this).trigger('ebusEvent',[obj]);
					}
				});
			} else {
				console.log('mq no data');
			}
		}
	}
	
	/**
	 * 調用 DaaS RESTful 命令
	 * @param service DBus service
	 * @param path DBus path
	 * @param iface DBus interface
	 * @param method DBus method
	 * @param params DBus method params; 此為陣列
	 * @param isAsync 非同步呼叫；此為布林；預設為 false
	 * @param successFn：成功時回呼函式
	 * @param errorFn：失敗時回呼函式
	 * @param ip：DaaS服務的IP位址
	 */
	$.daas = {
		call: function(service,path,iface,method,params,isAsync,successFn,errorFn,ip){
			if(typeof params == 'undefined')
				params=[];
			if(typeof isAsync == 'undefined')
				isAsync=false;
				
			var obj;
			var info={
				'service':service,
				'path':path,
				'interface':iface,
				'method':method,
				'params':params
			};
			console.log('daas call '+info);
			if(!ip){
				ip=$.ebus.getIp();
			}else{
				console.log('daas service ip='+ip);
			}
			if(!$.ebus.isSameOrigin(ip)){
				console.log('daas service is not same origin!');
			}

			var param ={
				url:'http://'+ip+'/rest/daas/index.php/daas',
				type:'POST',
				data: JSON.stringify(info),
				cache: false,
				async: isAsync,
			};

			if(typeof successFn == 'undefined'){
				param.success = function(data){
					obj=data;
				}
			}else{
				param.success = successFn;
			}
			
			if(typeof errorFn == 'undefined'){
				param.error = function(data){
					console.log(data.responseText);
				};
			}else{
				param.error = errorFn;
			}
	
			$.ajax(param);
			if(!isAsync)
				return obj;
		},
	};
	
	$.event.special.ebusEvent = {
		setup: function(data, namespaces) {
			$(this).addClass('ebus-listener');
		},
		teardown: function(namespaces) {
			$(this).removeClass('ebus-listener');
		},
	};
	
	if(typeof String.prototype.startWith != 'function') {
		String.prototype.startWith = function(str) {
			return this.indexOf(str) == 0;
		};
	}
})(jQuery);
