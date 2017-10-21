var list = [
	"g.co",
	"goo.gl",
	"google.cn",
	"google.com",
	"google.com.hk",
	"gmail.com",
	"android.com",
	"chromium.org",
	"googlesource.com",
	"gstatic.com",
	"ggpht.com",
	"googleusercontent.com",
	"googlevideo.com",
	"googleapis.com",
	"appspot.com",
	"blogspot.com",
	"blogspot.jp",
	"blogger.com",
	"youtube.com",
	"youtu.be",
	"ytimg.com",
	"youtube-nocookie.com",

	"twitter.com",
	"twimg.com",
	"t.co",

	"facebook.com",
	"facebook.net",
	"fbcdn.net",
	"instagram.com",
	"cdninstagram.com",

	"vimeo.com",
	"kej.tw",
	"bing.com",
	"bing.net",
	"s3.amazonaws.com",
	"w3schools.com",
	"feedly.com",
	"medium.com",
	"wordpress.com",
	"zh.wikipedia.org",

	"bbc.com",
	"nytimes.com",
	"voanews.com",
	"voachinese.com",
	"epochtimes.com",
	"aboluowang.com",
	"ntdtv.com",
	"bannedbook.org",
	"creaders.net",
	"dw.com",
	"backchina.com",
	"ltn.com.tw",
	"rfi.fr",
	"wenxuecity.com",
	"rfa.org",
	"udn.com",
	"appledaily.com.tw",
	"thenewslens.com",
	"letscorp.net",
	"theinitium.com",
];


var domains = {};
for (var i = 0; i < list.length; i++) {
	domains[list[i]] = null;
}

function FindProxyForURL(url, host) {
	var suffix;
	var pos = host.lastIndexOf(".");

	while(true) {
		suffix = host.substring(pos + 1);

		if (typeof domains[suffix] == "undefined") {
			if (pos <= 0) {
				break;
			}
			else {
				pos = host.lastIndexOf(".", pos - 1);
			}
		}
		else {
			return "SOCKS 127.0.0.1:8888; DIRECT";
		}
	}

	return "DIRECT";
}
