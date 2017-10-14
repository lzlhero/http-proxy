var http = require('http');
var net = require('net');
var Socks = require('socks');
var url = require('url');
const debug = true;
const proxy = false;

var socksProxy = {
	ipaddress: "127.0.0.1",
	port: 8888,
	type: 5
};

var socksAgent = new Socks.Agent({proxy: socksProxy}, false, false);

function consoleLog(...arg) {
	if (debug) {
		console.log(...arg);
	}
}

http.createServer()
.on('request', function(req, down) {
	var info = url.parse(req.url);
	// for http direct request.
	if (!info.hostname) {
		down.writeHead(200, { 'Content-Type': 'text/plain' });
		down.end('It is okay.');
		return;
	}

	// for http proxy request.
	var options = {
		port    : info.port || 80,
		host    : info.hostname,
		path    : info.path,
		auth    : info.auth,
		method  : req.method,
		headers : req.headers,
		agent   : proxy ? socksAgent : null
	};
	// consoleLog('try proxy: ' + req.url);
	var up = http.request(options, function(res) {
		consoleLog('http proxy: ' + req.url);
		down.writeHead(res.statusCode, res.headers);
		res.pipe(down);
	})
	.on('error', function(err) {
		down.end();
	});

	req.pipe(up);
})
.on('connect', function(req, down, head) {
	// for ssl proxy tunnel.
	var info = url.parse('http://' + req.url);
	// consoleLog('try proxy: ' + req.url);

	if (proxy) {
		Socks.createConnection({
			proxy: socksProxy,
			target: {
				host: info.hostname,
				port: info.port
			},
			timeout: 60000
		}, function(err, up, info) {
			if (err) {
				consoleLog(err);
				down.end();
			}
			else {
				up.on('error', function(err) {
					down.end();
				});
				consoleLog('ssl proxy: ' + req.url);
				down.write('HTTP/1.1 200 Connection Established\r\n\r\n');
				down.pipe(up).pipe(down);
			}
		});
	}
	else {
		var up = net.connect(info.port, info.hostname, function() {
			consoleLog('ssl proxy: ' + req.url);
			down.write('HTTP/1.1 200 Connection Established\r\n\r\n');
			down.pipe(up).pipe(down);
		})
		.on('error', function(err) {
			down.end();
		});
	}
})
.listen(8080, '0.0.0.0',function() {
	console.log('Listening on ' + this.address().address + ':' + this.address().port);
});
