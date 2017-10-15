var net = require('net');
var url = require('url');
var http = require('http');
var socks = require('socks');

const showLog = true;
const allBySocks = false;

var forceSocksHosts = [
	"graph.facebook.com",
];

var socksProxy = {
	ipaddress: "127.0.0.1",
	port: 8888,
	type: 5
};

var socksAgent = new socks.Agent({proxy: socksProxy}, false, false);

function consoleLog(...arg) {
	if (showLog) {
		console.log(...arg);
	}
}

http.createServer()
.on('request', function(req, down) {
	var info = url.parse(req.url);

	// for http direct request, http server response.
	if (!info.hostname) {
		down.writeHead(200, { 'Content-Type': 'text/plain' });
		down.end('Server is running.');
		return;
	}

	// for http proxy request.
	var isBySocks = allBySocks || forceSocksHosts.indexOf(info.hostname) != -1;
	var options = {
		port    : info.port || 80,
		host    : info.hostname,
		path    : info.path,
		auth    : info.auth,
		method  : req.method,
		headers : req.headers,
		agent   : isBySocks ? socksAgent : null
	};

	//consoleLog('http try: ' + req.url);

	var up = http.request(options, function(res) {
		consoleLog((isBySocks ? 'socks ' : '') + 'http pass: ' + req.url);
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

	//consoleLog('ssl try: ' + req.url);

	var isBySocks = allBySocks || forceSocksHosts.indexOf(info.hostname) != -1;
	if (isBySocks) {
		socks.createConnection({
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
				consoleLog('socks ssl pass: ' + req.url);
				down.write('HTTP/1.1 200 Connection Established\r\n\r\n');
				down.pipe(up).pipe(down);
			}
		});
	}
	else {
		var up = net.connect(info.port, info.hostname, function() {
			consoleLog('ssl pass: ' + req.url);
			down.write('HTTP/1.1 200 Connection Established\r\n\r\n');
			down.pipe(up).pipe(down);
		})
		.on('error', function(err) {
			down.end();
		});
	}
})
.listen(8080, '0.0.0.0',function() {
	console.log('Http(s) proxy ' + (allBySocks ? 'by socks ' : '' ) + 'listening on ' + this.address().address + ':' + this.address().port);
});
