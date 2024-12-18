var fs = require('fs');
var net = require('net');
var url = require('url');
var http = require('http');
var https = require('https');
var socksClient = require('socks').SocksClient;
var socksProxyAgent = require('socks-proxy-agent').SocksProxyAgent;
var shell = require('child_process');
var replace = require('stream-replace');
var isNeedProxy = require('./proxy.pac');

/* MUST BE SOCKS5 PROXY ADDRESS */
const socksConfig = {
  host: '127.0.0.1',
  port: 8888
};
socksConfig.type = 5;
const socksURI = `socks://${socksConfig.host}:${socksConfig.port}`;
const allBySocks = false;
const socketTimeout = 10000;


// console log helper
function log(...arg) {
  if (process.env.HTTP_PROXY_LOG) {
    console.log(...arg);
  }
}


// close socket resources
function closeSocket() {
  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i].writable) {
      arguments[i].end();
    }
  }
}


// restart http proxy by shell script
function restartHttpProxy() {
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

  function enable() {
    setTimeout(function() {
      disabled = false;
    }, cooldown);
  }

  return function(url) {
    if (disabled) return;
    disabled = true;

    var socksAgent = new socksProxyAgent(socksURI, { timeout: socketTimeout });
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
  var headers = {}, name, value, type;

  for (var i = 0; i < rawHeaders.length; i = i + 2) {
    name = rawHeaders[i];
    // remove non-ascii characters from header
    value = rawHeaders[i + 1].replace(/[^\x20-\x7E]+/g, '');

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
      res.end(`HTTP Proxy${allBySocks ? ' all by socks' : ''} has been reloaded.`);
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

  log(`${isBySocks ? '*' : ' '} connect <<: ${url}`);
}


/*
  listen 'connect' sockets events
   clientSocket and serverSocket are sockets <net.Socket>
*/
function connectPipeEvents(clientSocket, serverSocket, isBySocks, url) {
  // server socket closed events
  serverSocket
  .on('end', function() {
    closeSocket(clientSocket);
  })
  .on('error', function(err) {
    log(`${isBySocks ? '*' : ' '} connect <X: [${err.message}] ${url}`);
    closeSocket(clientSocket);
  })
  .on('close', function() {
    log(`${isBySocks ? '*' : ' '} connect <C: ${url}`);
    closeSocket(clientSocket);
  });

  // client socket closed events
  clientSocket
  .on('end', function() {
    closeSocket(serverSocket);
  })
  .on('error', function(err) {
    log(`${isBySocks ? '*' : ' '} connect >X: [${err.message}] ${url}`);
    closeSocket(serverSocket);
  })
  .on('close', function() {
    log(`${isBySocks ? '*' : ' '} connect >C: ${url}`);
    closeSocket(serverSocket);
  });
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
  var isBySocks = allBySocks || isNeedProxy(hostname);
  var options = {
    agent: isBySocks ? new socksProxyAgent(socksURI) : null,
    headers: purgeHeaders(clientRequest.rawHeaders),
    method: clientRequest.method
  };

  // proxyRequest is client request stream <http.ClientRequest>
  // serverResponse is server response message <http.IncomingMessage>
  var proxyRequest = (protocol === 'http:' ? http : https)
      .request(clientRequest.url, options, function(serverResponse) {
    // transfer server code and headers to proxyResponse
    var headers = purgeHeaders(serverResponse.rawHeaders);
    try {
      proxyResponse.writeHead(serverResponse.statusCode, headers);
    }
    catch (err) {
      console.log(`writeHead() error with: ${clientRequest.url}`);
      console.dir(headers);
    }

    // server response end
    serverResponse.on('end', function() {
      log(`${isBySocks ? '*' : ' '} request <<: ${clientRequest.url}`);
    });

    // transfer server response to proxy response
    serverResponse.pipe(proxyResponse);
  })
  .setTimeout(socketTimeout, function() {
    log(`${isBySocks ? '*' : ' '} request <?: ${clientRequest.url}`);

    // proxyRequest.socket equal serverResponse.socket
    closeSocket(proxyRequest.socket);
  })
  // normal or socks proxy request error
  .on('error', function(err) {
    log(`${isBySocks ? '*' : ' '} request XX: [${err.message}]: ${clientRequest.url}`);

    // socks proxy error, check socks proxy
    if (isBySocks) {
      checkSocksProxy(clientRequest.url);
    }

    // destroy stream without socket FIN
    proxyResponse.destroy();
    proxyRequest.destroy();
  });

  // transfer client request to proxy request
  clientRequest.pipe(proxyRequest);

  log(`${isBySocks ? '*' : ' '} request >>: ${clientRequest.url}`);
})
// clientRequest is client request message <http.IncomingMessage>
// clientSocket is client socket <net.Socket>
// head is buffer <Buffer>
.on('connect', function(clientRequest, clientSocket, head) {

  /* https 'connect' proxy */
  var { hostname, port } = url.parse(`https://${clientRequest.url}`);
  port = parseInt(port, 10);
  var isBySocks = allBySocks || isNeedProxy(hostname);

  log(`${isBySocks ? '*' : ' '} connect >>: ${clientRequest.url}`);

  // socks 'connect'
  if (isBySocks) {
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
      // socks 'connect' proxy error
      if (err) {
        log(`* connect XX: [${err.message}]: ${clientRequest.url}`);

        checkSocksProxy(clientRequest.url);
        closeSocket(clientSocket);
        return;
      }

      var serverSocket = info.socket;
      // listen 'connect' sockets events
      connectPipeEvents(clientSocket, serverSocket, isBySocks, clientRequest.url);
      // serverSocket is server socket <net.Socket>
      connectPipe(clientSocket, serverSocket, head, isBySocks, clientRequest.url);
    });
  }
  // noraml 'connect'
  else {
    try {
      var serverSocket = net.createConnection(port, hostname, function() {
        // serverSocket is server socket <net.Socket>
        connectPipe(clientSocket, serverSocket, head, isBySocks, clientRequest.url);
      });
    }
    catch (err) {
      closeSocket(clientSocket);
      return;
    }

    // listen 'connect' sockets events
    connectPipeEvents(clientSocket, serverSocket, isBySocks, clientRequest.url);
  }
})
.on('clientError', function(err, clientSocket) {
  closeSocket(clientSocket);
})
.listen(8080, '0.0.0.0', function() {
  var { address, port } = this.address();
  console.log(`HTTP Proxy${allBySocks ? ' all by socks' : ''} on ${address}:${port}`);
});


// listen process uncaught exception event
process.on('uncaughtException', function (err) {
  if (err.code === 'ECONNABORTED') {
    return;
  }

  console.log(`uncaughtException.\ncode: ${err.code}\nmessage: ${err.message}\nstack: ${err.stack}`);
});
