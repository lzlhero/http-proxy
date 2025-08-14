const fs = require('fs');
const shell = require('child_process');
const net = require('net');
const url = require('url');
const http = require('http');
const https = require('https');
const socksClient = require('socks').SocksClient;
const socksProxyAgent = require('socks-proxy-agent').SocksProxyAgent;
const replace = require('stream-replace');
const { socksHost, socksPort, isNeedProxy } = require('./proxy.pac');


// config values
const socketKeepIdle = 60000;
const socketTimeout = 30000;
const socksConfig = { host: socksHost, port: socksPort, type: 5 };
const socksUri = `socks://${socksHost}:${socksPort}`;


// console log helper
function log(...arg) {
  if (process.env.HTTP_PROXY_LOG) {
    console.log(...arg);
  }
}


// validate url string
function isValidHttpUrl(url) {
  try {
    const object = new URL(url);
    return object.protocol === 'http:' || object.protocol === 'https:';
  } catch (err) {
    return false;
  }
}


// destroy socket resources
function destroySocket() {
  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i].writable) {
      arguments[i].end();
    }
    if (!arguments[i].destroyed) {
      arguments[i].destroy();
    }
  }
}


// restart http proxy by shell script
function restartHttpProxy() {
  shell.exec('http-proxy', function(err, stdout, stderr) {
    // only be executed with http-proxy failure
    console.log(`http-proxy: ${stderr.trim()}`);
  });
}


// restart socks proxy by shell script
function restartSocksProxy() {
  shell.exec('socks-proxy', function(err, stdout, stderr) {
    console.log(`socks-proxy: ${err ? stderr.trim() : 'executed.'}`);
  });
}


// check socks proxy, if not restart it
var checkSocksProxy = (function() {
  var disabled = false;
  var cooldown = 60000;

  function enable() {
    setTimeout(function() {
      disabled = false;
    }, cooldown);
  }

  return function(url) {
    if (disabled) return;
    disabled = true;

    var socksAgent = new socksProxyAgent(socksUri, { timeout: socketTimeout });
    http.get({
      port: 443,
      host: 'www.google.com',
      agent: socksAgent
    }, function(res) {
      enable();
    })
    .on('error', function(err) {
      log(`$socks-proxy: [${err.message}]: ${url}`);

      restartSocksProxy();
      enable();
    });
  };
})();


// purge headers object from rawHeaders
function purgeHeaders(rawHeaders) {
  var headers = {}, name, lowerCaseName, value, type;

  for (var i = 0; i < rawHeaders.length; i = i + 2) {
    name = rawHeaders[i];
    lowerCaseName = name.trim().toLowerCase();

    // rewrite 'connection' header to 'close'
    if (lowerCaseName === 'connection' || lowerCaseName === 'proxy-connection') {
      value = 'close';
    }
    // remove non-ascii characters from header
    else {
      value = rawHeaders[i + 1].replace(/[^\x20-\x7E]+/g, '');
    }

    // add header by current header existing or not
    type = typeof headers[name];
    if (type === 'undefined') {
      headers[name] = value;
    }
    else if (type === 'string') {
      // build array structure
      // headers[name]: 1st same name header
      // value: 2nd same name header
      headers[name] = [headers[name], value];
    }
    else {
      // value: 3rd(>=) same name header
      headers[name].push(value);
    }
  }

  return headers;
}


/*
  service a lite http server, which is for client directly without proxy.
    req is client request message <http.IncomingMessage>
    res is server response stream <http.ServerResponse>
*/
function httpServer(req, res) {
  var info = url.parse(`http://${req.headers.host}${req.url}`);

  switch (info.pathname) {
    case '/':
      restartHttpProxy();
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('HTTP Proxy has been reloaded.');
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


/*
  pipe 'connect' sockets stream
    clientSocket and serverSocket are sockets <net.Socket>
    head is buffer <Buffer>
*/
function connectPipe(clientSocket, serverSocket, head, isBySocks, url) {
  if (!clientSocket.writable || !serverSocket.writable) return;

  clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
  serverSocket.write(head);
  serverSocket.pipe(clientSocket);
  clientSocket.pipe(serverSocket);

  log(`${isBySocks ? '*' : ' '} connect ==: ${url}`);
}


/*
  listen 'connect' sockets events
   clientSocket and serverSocket are sockets <net.Socket>
*/
function connectPipeEvents(clientSocket, serverSocket, isBySocks, url) {
  function clientSocketEnd() {
    destroySockets();
    log(`${isBySocks ? '*' : ' '} connect |<: ${url}`);
  }

  function clientSocketError(err) {
    destroySockets();
    log(`${isBySocks ? '*' : ' '} connect X<: [${err.message}] ${url}`);
  }

  function clientSocketTimeout() {
    destroySockets();
    log(`${isBySocks ? '*' : ' '} connect ?<: ${url}`);
  }

  function serverSocketEnd() {
    destroySockets();
    log(`${isBySocks ? '*' : ' '} connect >|: ${url}`);
  }

  function serverSocketError(err) {
    destroySockets();
    log(`${isBySocks ? '*' : ' '} connect >X: [${err.message}] ${url}`);
  }

  function serverSocketTimeout() {
    destroySockets();
    log(`${isBySocks ? '*' : ' '} connect >?: ${url}`);
  }

  function destroySockets() {
    // remove event listeners
    clientSocket.removeListener('end', clientSocketEnd);
    clientSocket.removeListener('error', clientSocketError);
    serverSocket.removeListener('end', serverSocketEnd);
    serverSocket.removeListener('error', serverSocketError);
    if (isBySocks) {
      clientSocket.removeListener('timeout', clientSocketTimeout);
      serverSocket.removeListener('timeout', serverSocketTimeout);
    }

    // unpipe sockets
    clientSocket.unpipe(serverSocket);
    serverSocket.unpipe(clientSocket);

    // destroy client and server sockets
    destroySocket(clientSocket, serverSocket);
  }

  // add event listeners
  clientSocket.on('end', clientSocketEnd);
  clientSocket.on('error', clientSocketError);
  serverSocket.on('end', serverSocketEnd);
  serverSocket.on('error', serverSocketError);
  if (isBySocks) {
    clientSocket.setTimeout(socketTimeout, clientSocketTimeout);
    serverSocket.setTimeout(socketTimeout, serverSocketTimeout);
  }
}


// httpProxy is <http.Server>
var httpProxy = http.createServer()
// clientRequest is client request message <http.IncomingMessage>
// proxyResponse is server response stream <http.ServerResponse>
.on('request', function(clientRequest, proxyResponse) {

  var { hostname, protocol } = url.parse(clientRequest.url);

  /* directly without proxy */
  if (!hostname) return httpServer(clientRequest, proxyResponse);

  /* http/https 'request' proxy */

  // url must be valid
  if (!isValidHttpUrl(clientRequest.url)) {
    console.log(`invalid request with: ${clientRequest.url}`);
    proxyResponse.destroy();
    return;
  }

  var isBySocks = isNeedProxy(hostname);
  var options = {
    agent: isBySocks ? new socksProxyAgent(socksUri, { timeout: socketTimeout }) : null,
    headers: purgeHeaders(clientRequest.rawHeaders),
    method: clientRequest.method,
    timeout: socketTimeout
  };

  log(`${isBySocks ? '*' : ' '} request >>: ${clientRequest.url}`);

  // proxyRequest is client request stream <http.ClientRequest>
  // serverResponse is server response message <http.IncomingMessage>
  var proxyRequest = (protocol === 'http:' ? http : https)
      .request(clientRequest.url, options, function(serverResponse) {

    // transfer server response code and headers to proxy response
    var headers = purgeHeaders(serverResponse.rawHeaders);
    try {
      proxyResponse.writeHead(serverResponse.statusCode, headers);
    }
    catch (err) {
      console.log(`writeHead() error with: ${clientRequest.url}`);
      console.dir(headers);
    }

    serverResponse
    // server response end
    .on('end', function() {
      log(`${isBySocks ? '*' : ' '} request <<: ${clientRequest.url}`);
    })
    // server response timeout
    .setTimeout(socketTimeout, function() {
      log(`${isBySocks ? '*' : ' '} request <?: ${clientRequest.url}`);

      // destroy manually
      proxyResponse.destroy();
      serverResponse.destroy();
      proxyRequest.destroy();
    });

    // transfer server response body to proxy response
    serverResponse.pipe(proxyResponse);
  })
  // proxy request timeout
  .on('timeout', function() {
    log(`${isBySocks ? '*' : ' '} request ?>: ${clientRequest.url}`);

    // destroy manually
    proxyRequest.destroy();
  })
  // proxy request error
  .on('error', function(err) {
    log(`${isBySocks ? '*' : ' '} request XX: [${err.message}]: ${clientRequest.url}`);

    // socks proxy error, check socks proxy
    if (isBySocks) {
      checkSocksProxy(clientRequest.url);
    }

    // destroy manually
    proxyResponse.destroy();
    proxyRequest.destroy();
  });

  // transfer client request to proxy request
  clientRequest.pipe(proxyRequest);
})
// clientRequest is client request message <http.IncomingMessage>
// clientSocket is client socket <net.Socket>
// head is buffer <Buffer>
.on('connect', function(clientRequest, clientSocket, head) {

  // set client socket keep idle time
  clientSocket.setKeepAlive(true, socketKeepIdle);

  /* https 'connect' proxy */
  var { hostname, port } = url.parse(`https://${clientRequest.url}`);
  port = parseInt(port, 10) || 443;
  var isBySocks = isNeedProxy(hostname);

  log(`${isBySocks ? '*' : ' '} connect >>: ${clientRequest.url}`);

  if (isBySocks) {
    // socks 'connect'
    var options = {
      proxy: socksConfig,
      destination: {
        host: hostname,
        port: port
      },
      command: 'connect',
      timeout: socketTimeout
    };
    socksClient.createConnection(options, function(err, info) {
      if (err) {
        // socks 'connect' error
        log(`* connect XX: [${err.message}]: ${clientRequest.url}`);

        // check socks proxy status
        checkSocksProxy(clientRequest.url);
        // destroy client socket
        destroySocket(clientSocket);
        return;
      }

      var serverSocket = info.socket;
      // set server socket keep idle time
      serverSocket.setKeepAlive(true, socketKeepIdle);
      // listen 'connect' sockets events
      connectPipeEvents(clientSocket, serverSocket, isBySocks, clientRequest.url);
      // serverSocket is server socket <net.Socket>
      connectPipe(clientSocket, serverSocket, head, isBySocks, clientRequest.url);
    });
  }
  else {
    try {
      // normal 'connect'
      var options = {
        host: hostname,
        port: port,
        keepAlive: true,
        keepAliveInitialDelay: socketKeepIdle
      };
      var serverSocket = net.createConnection(options, function() {
        // serverSocket is server socket <net.Socket>
        connectPipe(clientSocket, serverSocket, head, isBySocks, clientRequest.url);
      });
    }
    catch (err) {
      // normal 'connect' error
      log(`  connect XX: [${err.message}]: ${clientRequest.url}`);

      // destroy client socket
      destroySocket(clientSocket);
      return;
    }

    // listen 'connect' sockets events
    connectPipeEvents(clientSocket, serverSocket, isBySocks, clientRequest.url);
  }
})
.on('clientError', function(err, clientSocket) {
  destroySocket(clientSocket);
})
.listen(8080, '0.0.0.0', function() {
  var { address, port } = this.address();
  console.log(`HTTP Proxy on ${address}:${port}`);
});


// listen process uncaught exception error
process.on('uncaughtException', function (err) {
  var { code, message, stack } = err;
  if (code === 'ECONNRESET'
    || code === 'EHOSTUNREACH'
    || code === 'ECONNABORTED') {
    return;
  }

  console.log(`Uncaught Exception Error\ncode: ${code}\nmessage: ${message}\nstack: ${stack}`);
});
