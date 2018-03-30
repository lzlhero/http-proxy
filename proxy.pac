var list = [
	"g.co",
	"goo.gl",
	"google.cn",
	"google.com",
	"google.com.hk",
	"gmail.com",
	"android.com",
	"gvt1.com",
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
	"2mdn.net",
	"youtube-nocookie.com",
	"alphagoteach.deepmind.com",

	"twitter.com",
	"twimg.com",
	"t.co",

	"facebook.com",
	"facebook.net",
	"fbcdn.net",
	"fbsbx.com",
	"instagram.com",
	"cdninstagram.com",

	"ift.tt",
	"vimeo.com",
	"vine.co",
	"kej.tw",
	"bing.com",
	"bing.net",
	"s3.amazonaws.com",
	"w3schools.com",
	"medium.com",
	"wordpress.com",
	"zh.wikipedia.org",
	"zh.m.wikipedia.org",
	"gist.github.com",
	"github.io",
	"telegram.org",

	"bbc.com",
	"botanwang.com",
	"blogblog.com",
	"bloomberg.com",
	"bullog.org",
	"ftchinese.com",
	"nyt.com",
	"nytcn.me",
	"nytimes.com",
	"nytstyle.com",
	"voanews.com",
	"voachinese.com",
	"epochtimes.com",
	"aboluowang.com",
	"ntdtv.com",
	"bannedbook.org",
	"creaders.net",
	"dw.com",
	"dwnews.com",
	"dwnews.net",
	"backchina.com",
	"ltn.com.tw",
	"rfi.fr",
	"wenxuecity.com",
	"rfa.org",
	"udn.com",
	"appledaily.com",
	"appledaily.com.tw",
	"thenewslens.com",
	"letscorp.net",
	"theinitium.com",
	"chinadigitaltimes.net",
	"trt.net.tr",
	"zaobao.com.sg",
	"huaglad.com",
	"ow.ly",
	"bit.ly",
	"pin-cong.com",
	"shadowsocks.org",
	"xuehua.us",
];


var isNeedProxy = (function() {
	var domains = {};
	for (var i = 0; i < list.length; i++) {
		domains[list[i]] = null;
	}
	list = null;

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


function FindProxyForURL(url, host) {
	return isNeedProxy(host) ? "SOCKS5 127.0.0.1:8888; DIRECT" : "DIRECT";
}


if (typeof module != "undefined") {
	module.exports = isNeedProxy;
}
