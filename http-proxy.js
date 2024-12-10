var fs = require('fs');
var net = require('net');
var url = require('url');
var http = require('http');
var https = require('https');
var socks = require('socks');
var shell = require('child_process');
var replace = require('stream-replace');
var isNeedProxy = require('./proxy.pac');

const allBySocks = false;
const httpTimeout = 5000;
const socketTimeout = 10000;
const socksProxy = {
  ipaddress: '127.0.0.1',
  port: 8888,
  type: 5
};


// console log helper
function log(...arg) {
  if (process.env.HTTP_PROXY_LOG) {
    console.log(...arg);
  }
}


// destroy socket resources
function destroySocket() {
  for (var i = 0; i < arguments.length; i++) {
    if (!arguments[i].destroyed) {
      arguments[i].destroy();
    }
  }
}


// restart http proxy by shell script
function restartProxy() {
  shell.exec('proxy', function(err, stdout, stderr) {
    if(err) {
      console.log(`proxy error: ${stderr.trim()}`);
    }
  });
}


// restart socks proxy by shell script
function restartSocksProxy() {
  shell.exec('socks-proxy', function(err, stdout, stderr) {
    if(err) {
      console.log(`socks-proxy error: ${stderr.trim()}`);
    }
  });
}


// check socks proxy, if not restart it
var checkSocksProxy = (function() {
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
      destroySocket(socksAgent.encryptedSocket);
      enabled();
    })
    .on('error', function(err) {
      log(`+ socks #: ${err.code}: ${url}`);

      restartSocksProxy();
      enabled();
    });
  };
})();


// get headers object from rawHeaders
function getHeaders(rawHeaders) {
  var headers = {}, name, value, type;

  for (var i = 0; i < rawHeaders.length; i = i + 2) {
    // remove non-ascii characters from header
    value = rawHeaders[i + 1].replace(/[^\x20-\x7E]+/g, '');
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


// service a lite http server, for http request directly, not for proxy.
function httpServer(req, res) {
  var info = url.parse(`http://${req.headers.host}${req.url}`);

  switch (info.pathname) {
    case '/':
      restartProxy();
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`HTTP Proxy Server${allBySocks ? ' all by socks' : ''} has been reloaded.`);
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


// listen 'connect' sockets exception events
// up|down are <net.Socket> <stream.Duplex> <stream.Readable> <stream.Writable>
function connectOnException(up, down, isBySocks, url) {
  // server: destroy the down stream when server side close
  up
  .on('end', function() {
    destroySocket(down);
  })
  .on('error', function(err) {
    log(`${isBySocks ? '*' : ' '} connect <X: ${err.code}: ${url}`);
    destroySocket(down);
  });
  if (!isBySocks) {
    up.setTimeout(socketTimeout, function() {
      // normal https up stream timeout
      log(`  connect <?: ${url}`);
      destroySocket(up, down);
    });
  }

  // client: destroy the up stream when client side close
  down
  .on('end', function() {
    destroySocket(up);
  })
  .on('error', function(err) {
    log(`${isBySocks ? '*' : ' '} connect >X: ${err.code}: ${url}`);
    destroySocket(up);
  })
  .setTimeout(socketTimeout, function() {
    log(`${isBySocks ? '*' : ' '} connect >?: ${url}`);
    destroySocket(up, down);
  });
}


// pipe 'connect' sockets stream
// up|down are <net.Socket> <stream.Duplex> <stream.Readable> <stream.Writable>
function connectPipe(up, down, isBySocks, url) {
  if (!down.writable) return;

  down.write('HTTP/1.1 200 Connection Established\r\n\r\n');
  down.pipe(up).pipe(down);

  log(`${isBySocks ? '*' : ' '} connect <<: ${url}`);
}


// http server defination
var server = http.createServer()
// req is <http.IncomingMessage> <stream.Readable>
// down is <http.ServerResponse> <Stream>
.on('request', function(req, down) {
  var { hostname, protocol } = url.parse(req.url);

  /*
   * for http request directly, not for proxy.
   */
  if (!hostname) return httpServer(req, down);

  /*
   * below all for http(s) request proxy.
   */
  var aborted = false;
  var isBySocks = allBySocks || isNeedProxy(hostname);
  var options = {
    agent  : isBySocks ? new socks.Agent({proxy: socksProxy}, false, false) : null,
    headers: getHeaders(req.rawHeaders),
    method : req.method
  };

  // res stream is a <http.IncomingMessage> <stream.Readable>
  // up stream is a <http.ClientRequest> <Stream>
  var up = (protocol === 'http:' ? http : https).request(req.url, options, function(res) {
    // pass server code and headers to down stream
    var headers = getHeaders(res.rawHeaders);
    try {
      down.writeHead(res.statusCode, headers);
    }
    catch (error) {
      console.log(`writeHead() error with: ${req.url}`);
      console.dir(headers);
    }

    // pass server body to down stream
    res.pipe(down);

    res.on('end', function() {
      log(`${isBySocks ? '*' : ' '} request <<: ${req.url}`);
      up.destroy();
    });
  })
  .on('error', function(err) {
    if (aborted) return;

    log(`${isBySocks ? '*' : ' '} request XX: ${err.code}: ${req.url}`);

    if (isBySocks) {
      // check socks proxy, if not restart it
      checkSocksProxy(req.url);
    }
    down.end();
  });

  // abort the up stream when client side error
  down.on('close', function() {
    aborted = true;
    up.destroy();
  });

  log(`${isBySocks ? '*' : ' '} request >>: ${req.url}`);

  // pass client body to up stream
  req.pipe(up);
})
// req is <http.IncomingMessage> <stream.Readable>
// down is <net.Socket> <stream.Duplex> <stream.Readable> <stream.Writable>
// head is <Buffer>
.on('connect', function(req, down, head) {
  /*
   * below all for https connect proxy.
   */
  var { hostname, port } = url.parse(`https://${req.url}`);
  var isBySocks = allBySocks || isNeedProxy(hostname);

  log(`${isBySocks ? '*' : ' '} connect >>: ${req.url}`);

  if (isBySocks) {
    socks.createConnection({
      proxy: socksProxy,
      target: {
        host: hostname,
        port: port
      },
      timeout: socketTimeout
    }, function(err, up, info) {
      if (err) {
        log(`+ socks X: ${err.code}: ${req.url}`);

        // socks proxy timeout. check it, if not restart it
        checkSocksProxy(req.url);
        destroySocket(down);
      } else {
        // socks https pipe up to down
        // listen 'connect' exception events
        connectOnException(up, down, isBySocks, req.url);
        // up is <net.Socket> <stream.Duplex> <stream.Readable> <stream.Writable>
        connectPipe(up, down, isBySocks, req.url);
      }
    });
  }
  else {
    try {
      // normal https pipe up to down
      // up is <net.Socket> <stream.Duplex> <stream.Readable> <stream.Writable>
      var up = net.createConnection(port, hostname, function() {
        connectPipe(up, down, isBySocks, req.url);
      });
    }
    catch (error) {
      destroySocket(down);
      return;
    }

    // listen 'connect' exception events
    connectOnException(up, down, isBySocks, req.url);
  }
})
.on('clientError', function(err, down) {
  destroySocket(down);
})
.listen(8080, '0.0.0.0', function() {
  var { address, port } = this.address();
  console.log(`Http Proxy Server${allBySocks ? ' all by socks' : ''} on ${address}:${port}`);
});


// important, set inactivity http timeout
server.timeout = httpTimeout;


// listen exception without try catch
process.on('uncaughtException', function (err) {
  if (err.code === 'ECONNABORTED') {
    return;
  }

  console.log(`uncaughtException.\ncode: ${err.code}\nmessage: ${err.message}\nstack: ${err.stack}`);
});
