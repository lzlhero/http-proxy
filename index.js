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


function consoleLog(...arg) {
	if (showLog) {
		console.log(...arg);
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
			socksAgent.encryptedSocket.end();
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


// catch exceptions
process.on('uncaughtException', function (err) {
	console.error((new Date).toLocaleString() + ' uncaughtException:', err.message);
	console.error(err.stack);
	process.exit(1);
});


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

	var up = http.request(options, function(res) {
		//consoleLog((isBySocks ? 'socks ' : '') + 'pass: ' + req.url);

		try {
			down.writeHead(res.statusCode, res.headers);
			res.pipe(down);
		}
		catch (err) {
			consoleLog('error res with: ' + req.url);
			consoleLog('location: ' + res.headers.location);
			down.end();
		}
	})
	.on('error', function(err) {
		consoleLog((isBySocks ? 'error socks: ' : 'error: ') + req.url);

		// execute shell script
		if (isBySocks) {
			execScript(req.url);
		}
		down.end();
	});

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
				down.end();
			}
			else {
				up.on('error', function(err) {
					consoleLog('error socks: ' + req.url);
					down.end();
				});

				//consoleLog('socks pass: ' + req.url);

				down.write('HTTP/1.1 200 Connection Established\r\n\r\n');
				down.pipe(up).pipe(down);
			}
		});
	}
	else {
		var up = net.createConnection(info.port, info.hostname, function() {
			//consoleLog('pass: ' + req.url);

			down.write('HTTP/1.1 200 Connection Established\r\n\r\n');
			down.pipe(up).pipe(down);
		})
		.on('error', function(err) {
			consoleLog('error: ' + req.url);
			down.end();
		});
	}
})
.listen(8080, '0.0.0.0', function() {
	console.log('Http(s) proxy ' + (allBySocks ? 'by socks ' : '' ) + 'listening on ' + this.address().address + ':' + this.address().port);
});
