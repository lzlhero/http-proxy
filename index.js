var net = require('net');
var url = require('url');
var http = require('http');
var socks = require('socks');
var shell = require('child_process');
var isNeedProxy = require('./proxy.pac');

const showLog = true;
const allBySocks = false;

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
function closeSocket(socket) {
	if (!socket.destroyed) {
		socket.destroy();
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
		if (disabled) {
			return;
		}
		disabled = true;

		var socksAgent = new socks.Agent({proxy: socksProxy}, true, false);
		http.get({
			port    : 443,
			host    : 'm.facebook.com',
			agent   : socksAgent
		}, function(res) {
			closeSocket(socksAgent.encryptedSocket);
			enabled();
		})
		.on('error', function(err) {
			consoleLog('script with: ' + url);

			shell.exec('proxy.sh', function(err, stdout, stderr) {
				if(err) {
					consoleLog('script error: ' + stderr.trim());
				}
			});
			enabled();
		});
	};
})();


// pipe sockets stream
// up and down stream are <net.Socket> type
function socketsPipe(up, down, isBySocks, url) {
	down.write('HTTP/1.1 200 Connection Established\r\n\r\n');
	down.pipe(up).pipe(down);

	//consoleLog((isBySocks ? 'socks pass: ' : 'pass: ') + url);
}


// add sockets exception events
// up and down stream are <net.Socket> type
function socketsException(up, down, isBySocks, url) {
	up.setTimeout(1000, function() {
		closeSocket(up);
	})
	// server side close by error
	.on('error', function(err) {
		consoleLog((isBySocks ? 'error socks: ' : 'error: ') + url);
		closeSocket(down);

	})
	// server side close by FIN
	.on('end', function() {
		closeSocket(down);
	});

	// destroy the up stream when client side close
	// error(destroy without FIN) => close, end(FIN) => close
	down.setTimeout(1000, function() {
		closeSocket(down);
	})
	.on('close', function(hadError) {
		closeSocket(up);
	});
}


// http server defination
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
	var isBySocks = allBySocks || isNeedProxy(info.hostname);
	var options = {
		port    : info.port || 80,
		host    : info.hostname,
		path    : info.path,
		auth    : info.auth,
		method  : req.method,
		headers : req.headers,
		agent   : isBySocks ? new socks.Agent({proxy: socksProxy}, false, false) : null
	};

	//consoleLog('try: ' + req.url);

	var aborted = false;
	// up stream is a <http.ClientRequest> <stream.Writable>
	// res stream is a <http.ServerResponse> <stream.Writable>
	// down stream is a <http.ServerResponse> <stream.Writable>
	var up = http.request(options, function(res) {
		var status  = res.statusCode;
		var headers = JSON.parse(JSON.stringify(res.headers).replace(/\\u0000/g, ''));

		down.writeHead(status, headers);
		//pipe 'up response' to 'client response' stream
		res.pipe(down);

		res.on('end', function() {
			//consoleLog((isBySocks ? 'socks pass: ' : 'pass: ') + req.url);

			// release socks proxy resource.
			if (isBySocks) {
				up.destroy();
			}
		});
	})
	.on('error', function(err) {
		if (aborted) {
			return;
		}

		consoleLog((isBySocks ? 'error socks: ' : 'error: ') + req.url);

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

	// pipe 'client request' to 'up request' stream
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
			timeout: 10000
		}, function(err, up, info) {
			if (err) {
				consoleLog('error socks with: ' + req.url);

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
		var up = net.createConnection(info.port, info.hostname, function() {
			socketsPipe(up, down, isBySocks, req.url);
		});
		socketsException(up, down, isBySocks, req.url);
	}
})
.listen(8080, '0.0.0.0', function() {
	console.log('Http(s) proxy ' + (allBySocks ? 'by socks ' : '' ) + 'listening on ' + this.address().address + ':' + this.address().port);
});
