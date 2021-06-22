var list = [
	"g.co",
	"goo.gl",
	"google.cn",
	"google.com",
	"google.com.hk",
	"google.ae",
	"gmail.com",
	"android.com",
	"gvt1.com",
	"chrome.com",
	"chromium.org",
	"googlesource.com",
	"gstatic.com",
	"ggpht.com",
	"googleusercontent.com",
	"googlevideo.com",
	"googleapis.com",
	"googleblog.com",
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

	"mozilla.org",
	"ift.tt",
	"vimeo.com",
	"vine.co",
	"kej.tw",
	"bing.com",
	"bing.net",
	"s3.amazonaws.com",
	"w3schools.com",
	"golang.org",
	"substack.com",
	"medium.com",
	"wordpress.com",
	"wikipedia.org",
	"wikimedia.org",
	"github.com",
	"github.io",
	"github.blog",
	"code.jquery.com",
	"telegram.org",
	"reddit.com",
	"redd.it",
	"redditstatic.com",
	"redditmedia.com",
	"redgifs.com",
	"gfycat.com",
	"imgur.com",
	"apkmirror.com",
	"apkpure.com",
	"ycombinator.com",
	"ifixit.com",
	"dropbox.com",
	"dropboxstatic.com",
	"dropboxusercontent.com",

	"bbc.com",
	"bbci.co.uk",
	"botanwang.com",
	"blogblog.com",
	"bloomberg.com",
	"bullog.org",
	"ftchinese.com",
	"nyt.com",
	"nytcn.me",
	"nytimes.com",
	"nytstyle.com",
	"time.com",
	"wsj.com",
	"wsj.net",
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
	"ampproject.org",
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
	"lvv2.com",
	"feedburner.com",
	"feedly.com",
	"benfrain.com",
	"tubeheartbeat.com",
	"storm.mg",
	"hexieshe.com",
	"boxun.com",
	"tumblr.com",
	"flickr.com",
	"dlvr.it",
	"rti.org.tw",
	"pornhub.com",
	"phncdn.com",
	"nsfwmonster.com",
	"spankbang.com",
	"redtube.com",
	"rdtcdn.com",
	"ptt.cc",
	"setn.com",
	"steemit.com",
	"wolfax.com",
	"nikkei.com",
	"wenzhao.ca",
	"iyouport.org",
	"economist.com",
	"pincong.rocks",
	"archive.is",
	"matters.news",
	"jandan.net",
	"wallmama.com",
	"scmp.com",
	"xvideos.com",
	"businessweekly.com.tw",
	"rarbgprx.org",
	"williamlong.info",
	"pianyuan.org",
	"investing.com",
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

			if (domains[domain] === null) {
				return true;
			}
		} while (dot != -1);

		return false;
	}
})();


function FindProxyForURL(url, host) {
	return isNeedProxy(host) ? "SOCKS 127.0.0.1:8888; DIRECT" : "DIRECT";
}


if (typeof module !== "undefined") {
	module.exports = isNeedProxy;
}
