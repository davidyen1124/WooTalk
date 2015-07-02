var WebSocket = require('ws');
var events = require('events');
var request = require('request');
var chalk = require('chalk');
var readline = require('readline');

var talk = function() {
	var engine = new events.EventEmitter();

	engine.ready = false;

	engine.connect = function() {
		engine.ready = false;
		// GET wootalk page to get cookie
		request('https://wootalk.today/', function(err, req, body) {
			engine.emit('cookie');

			engine.ws = new WebSocket('wss://wootalk.today/websocket', [], {
				headers: {
					'Accept-Encoding': 'gzip, deflate, sdch',
					'Accept-Language': 'zh-TW,zh;q=0.8,en-US;q=0.6,en;q=0.4',
					'Cache-Control': 'no-cache',
					'Connection': 'Upgrade',
					'Cookie': req.headers['set-cookie'],
					'Host': 'wootalk.today',
					'Origin': 'https://wootalk.today',
					'Pragma': 'no-cache',
					'Sec-WebSocket-Version': '13',
					'Upgrade': 'websocket',
					'User-Agent': 'Fuck you',
				}
			});

			engine.ws.on('message', function(msg, flags) {
				try {
					msg = JSON.parse(msg);
				} catch (e) {
					return connect();
				}

				var status = msg[0][0];
				var data = msg[0][1].data;
				if (Array.isArray(data)) {
					data = data[0];
				}

				if (status === 'new_message' && data.status === 'chat_started') {
					engine.ready = true;
					engine.emit('start');
				} else if (status === 'new_message' && data.sender === 2) {
					engine.emit('message', data.message);
				} else if (status === 'new_message' && data.leave) {
					engine.emit('leave');
				} else if (status === 'websocket_rails.ping') {
					engine.emit('ping');
					if (engine.ready) engine.send('["websocket_rails.pong",{"id":102781,"data":{}}]');
				}
			});

			engine.send = function(msg) {
				if (engine.ready) engine.ws.send('["new_message",{"id":113295,"data":{"message":"' + msg + '","msg_id":1}}]');
			};

			engine.ws.on('error', function(err) {
				engine.emit('error', err);
			});
		});
	};
	engine.connect();

	return engine;
};

process.openStdin().addListener('data', function(data) {
	var line = data.toString().trim();

	if (line.indexOf('t0:') === 0) {
		line = line.replace('t0:', '');
		t0.send(line);
		console.log(chalk.green('t0: ') + chalk.bold.green(line));
	} else if (line.indexOf('t1:') === 0) {
		line = line.replace('t1:', '');
		t1.send(line);
		console.log(chalk.red('t1: ') + chalk.bold.red(line));
	}
});

var t0 = new talk();
var t1 = new talk();

var start_msg = '哈囉';

t0.on('start', function() {
	console.log(chalk.green('t0: ') + chalk.bold.green(start_msg));
	if (t0.ready && t1.ready) {
		t0.send(start_msg);
	}
});
t0.on('message', function(msg) {
	if (msg === start_msg && t0.ready && t1.ready) {
		t0.ws.close();
		t1.ws.close();
		t0.connect();
		t1.connect();
		return;
	}

	console.log(chalk.green('t0: ') + chalk.bold.green(msg));
	if (t0.ready && t1.ready) t1.send(msg);
});
t0.on('leave', function() {
	console.log(chalk.green('t0: ') + chalk.green('leave'));
	if (t0.ready && t1.ready) {
		t0.ws.close();
		t1.ws.close();
		t0.connect();
		t1.connect();
	}
});

t1.on('start', function() {
	console.log(chalk.red('t1: ') + chalk.bold.red(start_msg));
	if (t0.ready && t1.ready) {
		t1.send(start_msg);
	}
});
t1.on('message', function(msg) {
	if (msg === start_msg && t0.ready && t1.ready) {
		t0.ws.close();
		t1.ws.close();
		t0.connect();
		t1.connect();
	}

	console.log(chalk.red('t1: ') + chalk.bold.red(msg));
	if (t0.ready && t1.ready) t0.send(msg);
});
t1.on('leave', function() {
	console.log(chalk.red('t1: ') + chalk.red('leave'));
	if (t0.ready && t1.ready) {
		t0.ws.close();
		t1.ws.close();
		t0.connect();
		t1.connect();
	}
});