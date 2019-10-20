var fs = require('fs');
var net = require('net');
var url = require('url');
var http = require('http');
var socks = require('socks');
var shell = require('child_process');
var replace = require('stream-replace');
var isNeedProxy = require('./proxy.pac');

const showLog = true;
const allBySocks = false;
const httpTimeout = 5000;
const socketTimeout = 10000;

var socksProxy = {
	ipaddress: "127.0.0.1",
	port: 8888,
	type: 5
};

// console log helper
function consoleLog(...arg) {
	if (showLog) {
		console.log(...arg);
	}
}

// catch exceptions
process.on('uncaughtException', function (err) {
	console.error((new Date).toLocaleString() + ' uncaughtException:', err.message);
	console.error(err.stack);
	process.exit(1);
});


// close the socket resource
function closeSocket() {
	for (var i = 0; i < arguments.length; i++) {
		if (!arguments[i].destroyed) {
			arguments[i].destroy();
		}
	}
}


// check socks, then start socks by script
var execScript = (function() {
	var disabled = false;
	var cooldown = 60000;

	function enabled() {
		setTimeout(function() {
			disabled = false;
		}, cooldown);
	}

	return function(url) {
		if (disabled) return;
		disabled = true;

		var socksAgent = new socks.Agent({proxy: socksProxy}, true, false);
		http.get({
			port    : 443,
			host    : 'www.google.com',
			agent   : socksAgent
		}, function(res) {
			closeSocket(socksAgent.encryptedSocket);
			enabled();
		})
		.on('error', function(err) {
			//consoleLog('script with: ' + url);

			shell.exec('socks-proxy', function(err, stdout, stderr) {
				if(err) {
					consoleLog('script error: ' + stderr.trim());
				}
			});
			enabled();
		});
	};
})();


// get headers object from rawHeaders
function getHeaders(rawHeaders) {
	var headers = {}, name, value, type;

	for (var i = 0; i < rawHeaders.length; i = i + 2) {
		// remove non-ascii characters from header
		value = rawHeaders[i + 1].replace(/[^\x20-\x7E]/g, '');
		name  = rawHeaders[i];
		type  = typeof headers[name];

		if (type === 'undefined') {
			headers[name] = value;
		}
		else if (type === 'string') {
			headers[name] = [headers[name], value];
		}
		else {
			headers[name].push(value);
		}
	}

	return headers;
}


// pipe sockets stream
// up and down stream are <net.Socket> type
function socketsPipe(up, down, isBySocks, url) {
	if (!down.writable) return;

	down.write('HTTP/1.1 200 Connection Established\r\n\r\n');
	down.pipe(up).pipe(down);

	//consoleLog((isBySocks ? 'pass socks: ' : 'pass: ') + url);
}


// add sockets exception events
// up and down stream are <net.Socket> type
function socketsException(up, down, isBySocks, url) {
	// destroy the down stream when server side close
	up
	.on('error', function(err) {
		//consoleLog((isBySocks ? 'error socks: ' : 'error: ') + url);
		closeSocket(down);
	})
	.on('end', function() {
		closeSocket(down);
	});
	if (!isBySocks) {
		up.setTimeout(socketTimeout, function() {
			//consoleLog('request timeout: ' + url);
			closeSocket(up, down);
		});
	}

	// destroy the up stream when client side close
	down
	.on('error', function() {
		closeSocket(up);
	})
	.on('end', function() {
		closeSocket(up);
	})
	.setTimeout(socketTimeout, function() {
		closeSocket(up, down);
	});
}


// service a http lite server
function httpServer(req, res) {
	var info = url.parse('http://' + req.headers.host + req.url);

	switch (info.pathname) {
		case '/':
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			res.end('Server is running.');
			break;

		case '/proxy.pac':
			res.writeHead(200, { 'Content-Type': 'application/x-ns-proxy-autoconfig' });
			fs.createReadStream('proxy.pac')
				.pipe(replace('127.0.0.1', info.hostname))
				.pipe(res);
			break;

		default:
			res.writeHead(404, 'Not found');
			res.end();
	}
}


// http server defination
var server = http.createServer()
// req is <http.IncomingMessage>
// down is <http.ServerResponse>
.on('request', function(req, down) {
	var info = url.parse(req.url);

	// for http direct request, http server response.
	if (!info.hostname) return httpServer(req, down);

	// for http proxy request.
	var isBySocks = allBySocks || isNeedProxy(info.hostname);

	var options = {
		agent  : isBySocks ? new socks.Agent({proxy: socksProxy}, false, false) : null,
		headers: getHeaders(req.rawHeaders),
		method : req.method
	};

	var aborted = false;
	// up stream is a <http.ClientRequest> <stream.Writable>
	// down stream is a <http.ServerResponse> <stream.Writable>
	// res stream is a <http.IncomingMessage> <stream.Readable>
	var up = http.request(req.url, options, function(res) {
		// pass server code and headers to down stream
		down.writeHead(res.statusCode, getHeaders(res.rawHeaders));

		// pass server body to down stream
		res.pipe(down);

		res.on('end', function() {
			//consoleLog((isBySocks ? 'pass socks: ' : 'pass: ') + req.url);

			up.destroy();
		});
	})
	.on('error', function(err) {
		if (aborted) return;

		//consoleLog((isBySocks ? 'error socks: ' : 'error: ') + req.url);

		// execute shell script
		if (isBySocks) {
			execScript(req.url);
		}
		down.end();
	});

	// abort the up stream when client side error
	down.on('close', function() {
		aborted = true;
		up.destroy();
	});

	//consoleLog('try: ' + req.url);

	// pass client body to up stream
	req.pipe(up);
})
.on('connect', function(req, down, head) {
	// for ssl proxy tunnel.
	var info = url.parse('http://' + req.url);

	//consoleLog('try: ' + req.url);

	var isBySocks = allBySocks || isNeedProxy(info.hostname);
	if (isBySocks) {
		socks.createConnection({
			proxy: socksProxy,
			target: {
				host: info.hostname,
				port: info.port
			},
			timeout: socketTimeout
		}, function(err, up, info) {
			if (err) {
				//consoleLog('error socks with: ' + req.url);

				// execute shell script
				execScript(req.url);
				closeSocket(down);
				return;
			}

			socketsPipe(up, down, isBySocks, req.url);
			socketsException(up, down, isBySocks, req.url);
		});
	}
	else {
		try {
			var up = net.createConnection(info.port, info.hostname, function() {
				socketsPipe(up, down, isBySocks, req.url);
			});

			socketsException(up, down, isBySocks, req.url);
		}
		catch (error) {
			console.log('catch issue');
			console.dir(info);
		}
	}
})
.listen(8080, '0.0.0.0', function() {
	console.log('Http(s) proxy ' + (allBySocks ? 'by socks ' : '' ) + 'service on ' + this.address().address + ':' + this.address().port);
	shell.exec('echo $PATH', function(err, stdout, stderr) {
		consoleLog('$PATH: ' + stdout.trim());
	});
});

// important, set inactivity http timeout
server.timeout = httpTimeout;
