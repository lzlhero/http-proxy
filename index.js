var net = require('net');
var url = require('url');
var http = require('http');
var socks = require('socks');
var shell = require('child_process');
var forceSocksHosts = require('./list.js');

const showLog = true;
const allBySocks = false;

var socksProxy = {
	ipaddress: "127.0.0.1",
	port: 8888,
	type: 5
};


var isForceSocks = (function() {
	var domains = {};
	for (var i = 0; i < forceSocksHosts.length; i++) {
		domains[forceSocksHosts[i]] = null;
	}
	forceSocksHosts = null;

	return function(host) {
		var dot = host.length, domain;

		do {
			dot = host.lastIndexOf(".", dot - 1);
			domain = host.substring(dot + 1);

			if (typeof domains[domain] != "undefined") {
				return true;
			}
		} while (dot != -1);

		return false;
	}
})();


function consoleLog(...arg) {
	if (showLog) {
		console.log(...arg);
	}
}


// http server defination
http.createServer()
.on('request', function(req, down) {
	var info = url.parse(req.url);

	// for http direct request, http server response.
	if (!info.hostname) {
		if (info.pathname == '/') {
			shell.exec('proxy.sh', function(err, stdout, stderr) {
				if(err) {
					//consoleLog('shell: ' + stderr);
				}
			});
		}

		down.writeHead(200, { 'Content-Type': 'text/plain' });
		down.end('Server is running.');
		return;
	}

	// for http proxy request.
	var isBySocks = allBySocks || isForceSocks(info.hostname);
	var options = {
		port    : info.port || 80,
		host    : info.hostname,
		path    : info.path,
		auth    : info.auth,
		method  : req.method,
		headers : req.headers,
		agent   : isBySocks ? new socks.Agent({proxy: socksProxy}, false, false) : null
	};

	//consoleLog('http try: ' + req.url);

	var up = http.request(options, function(res) {
		//consoleLog((isBySocks ? 'socks ' : '') + 'http pass: ' + req.url);
		down.writeHead(res.statusCode, res.headers);
		res.pipe(down);
	})
	.on('error', function(err) {
		consoleLog('error ' + (isBySocks ? 'socks ' : '') + 'http: ' + req.url);
		down.end();
	});

	req.pipe(up);
})
.on('connect', function(req, down, head) {
	// for ssl proxy tunnel.
	var info = url.parse('http://' + req.url);

	//consoleLog('ssl try: ' + req.url);

	var isBySocks = allBySocks || isForceSocks(info.hostname);
	if (isBySocks) {
		socks.createConnection({
			proxy: socksProxy,
			target: {
				host: info.hostname,
				port: info.port
			},
			timeout: 30000
		}, function(err, up, info) {
			if (err) {
				consoleLog('error socks with: ' + req.url);
				down.end();
			}
			else {
				up.on('error', function(err) {
					consoleLog('error socks ssl: ' + req.url);
					down.end();
				});
				//consoleLog('socks ssl pass: ' + req.url);
				down.write('HTTP/1.1 200 Connection Established\r\n\r\n');
				down.pipe(up).pipe(down);
			}
		});
	}
	else {
		var up = net.createConnection(info.port, info.hostname, function() {
			//consoleLog('ssl pass: ' + req.url);
			down.write('HTTP/1.1 200 Connection Established\r\n\r\n');
			down.pipe(up).pipe(down);
		})
		.on('error', function(err) {
			consoleLog('error ssl: ' + req.url);
			down.end();
		});
	}
})
.listen(8080, '0.0.0.0', function() {
	console.log('Http(s) proxy ' + (allBySocks ? 'by socks ' : '' ) + 'listening on ' + this.address().address + ':' + this.address().port);
});
