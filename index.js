var http = require('http');
var net = require('net');
var url = require('url');
const debug = false;

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
	};
	var up = http.request(options, function(res) {
		consoleLog('http proxy: ' + req.url);
		down.writeHead(res.statusCode, res.headers);
		res.pipe(down);
	})
	.on('error', function(e) {
		down.end();
	});

	req.pipe(up);
})
.on('connect', function(req, down, head) {
	// for ssl proxy tunnel.
	var info = url.parse('http://' + req.url);
	var up = net.connect(info.port, info.hostname, function() {
		consoleLog('ssl proxy: ' + req.url);
		down.write('HTTP/1.1 200 Connection Established\r\n\r\n');
		down.pipe(up).pipe(down);
	})
	.on('error', function(e) {
		down.end();
	});
})
.listen(8080, '0.0.0.0',function() {
	console.log('Listening on ' + this.address().address + ':' + this.address().port);
});
