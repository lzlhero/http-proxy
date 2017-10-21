var domains = {
	"g.co": 1,
	"goo.gl": 1,
	"google.cn": 1,
	"google.com": 1,
	"google.com.hk": 1,
	"gmail.com": 1,
	"android.com": 1,
	"chromium.org": 1,
	"googlesource.com": 1,
	"gstatic.com": 1,
	"ggpht.com": 1,
	"googleusercontent.com": 1,
	"googlevideo.com": 1,
	"googleapis.com": 1,
	"appspot.com": 1,
	"blogspot.com": 1,
	"blogspot.jp": 1,
	"blogger.com": 1,
	"youtube.com": 1,
	"youtu.be": 1,
	"ytimg.com": 1,
	"youtube-nocookie.com": 1,

	"twitter.com": 1,
	"twimg.com": 1,
	"t.co": 1,

	"facebook.com": 1,
	"facebook.net": 1,
	"fbcdn.net": 1,
	"instagram.com": 1,
	"cdninstagram.com": 1,

	"kej.tw": 1,
	"bing.com": 1,
	"bing.net": 1,
	"s3.amazonaws.com": 1,
	"w3schools.com": 1,
	"feedly.com": 1,
	"medium.com": 1,
	"wordpress.com": 1,
	"zh.wikipedia.org": 1,

	"bbc.com": 1,
	"voanews.com": 1,
	"voachinese.com": 1,
	"epochtimes.com": 1,
	"aboluowang.com": 1,
	"ntdtv.com": 1,
	"bannedbook.org": 1,
	"creaders.net": 1,
	"dw.com": 1,
	"backchina.com": 1,
	"ltn.com.tw": 1,
	"rfi.fr": 1,
};


var hasOwnProperty = Object.hasOwnProperty;
function FindProxyForURL(url, host) {
	var suffix;
	var pos = host.lastIndexOf(".");

	while(true) {
		suffix = host.substring(pos + 1);

		if (hasOwnProperty.call(domains, suffix) && domains[suffix]) {
			return "SOCKS 127.0.0.1:8888; DIRECT";
		}
		else {
			if (pos <= 0) {
				break;
			}
			else {
				pos = host.lastIndexOf(".", pos - 1);
			}
		}
	}

	return "DIRECT";
}
