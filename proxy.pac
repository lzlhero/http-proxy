/* MUST BE SOCKS5 PROXY HOST */
var socksHost = "127.0.0.1";
var socksPort = 1080;
var socksAll = false;
var list = [
  "goog",
  "google",
  "g.co",
  "goo.gl",
  "google.cn",
  "google.com",
  "google.com.hk",
  "google.co.jp",
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
  "googlezip.net",
  "withgoogle.com",
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
  "golang.org",
  "bing.com",
  "bing.net",
  "github.com",
  "github.io",
  "github.blog",
  "githubusercontent.com",
  "facebook.com",
  "facebook.net",
  "fbcdn.net",
  "fbsbx.com",
  "instagram.com",
  "cdninstagram.com",
  "whatsapp.com",
  "whatsapp.net",
  "t.co",
  "x.com",
  "twitter.com",
  "twimg.com",
  "cms-twdigitalassets.com",
  "pscp.tv",
  "redd.it",
  "reddit.com",
  "redditstatic.com",
  "redditmedia.com",
  "redditinc.com",
  "reddithelp.com",
  "t.me",
  "telegram.org",
  "cdn-telegram.org",
  "dropbox.com",
  "dropboxstatic.com",
  "dropboxusercontent.com",
  "yahoo.com",
  "yimg.com",
  "flickr.com",
  "tumblr.com",
  "godaddy.com",
  "chatgpt.com",
  "oaistatic.com",
  "openai.com",
  "line.me",
  "line-apps.com",
  "line-scdn.net",
  "line.naver.jp",

  "wikipedia.org",
  "wikimedia.org",
  "wikileaks.org",
  "v2ex.com",
  "vimeo.com",
  "vine.co",
  "kej.tw",
  "s3.amazonaws.com",
  "w3schools.com",
  "substack.com",
  "medium.com",
  "wordpress.com",
  "code.jquery.com",
  "imgur.com",
  "apkmirror.com",
  "apkpure.com",
  "apkpure.net",
  "apkmonk.com",
  "apkcombo.com",
  "apkflash.net",
  "apkflash.com",
  "apk4fun.com",
  "apkhere.com",
  "androidapksfree.com",
  "aptoide.com",
  "happymod.com",
  "ycombinator.com",
  "quora.com",
  "uptodown.com",
  "bbc.com",
  "bbc.co.uk",
  "bbci.co.uk",
  "reuters.com",
  "reutersagency.com",
  "botanwang.com",
  "bloomberg.com",
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
  "dlvr.it",
  "rti.org.tw",
  "ptt.cc",
  "setn.com",
  "steemit.com",
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
  "businessweekly.com.tw",
  "rarbgprx.org",
  "investing.com",
  "mulanci.org",
  "mojim.com",
  "careerengine.us",
  "inf.news",
  "thinkpads.com",
  "f-droid.org",
  "bootstrapcdn.com",
  "pub.network",
  "youmaker.com",
  "pinterest.com",
  "pinimg.com",
  "proxifier.com",
  "fineproxy.org",
  "1337x.to",
  "kknews.cc",
  "inty.news",
  "secretchina.com",
  "kanzhongguo.com",
  "westca.com",
  "comefromchina.com",
  "cnd.org",
  "minzhuzhongguo.org",
  "renminbao.com",
  "chineseinla.com",
  "archive.org",
  "sydneytoday.com",
  "jinriaozhou.com",
  "mediatodaygroup.com",
  "jsdelivr.net",
  "btdig.com",
  "proton.me",
  "xiaomi.eu",
  "pixnet.net",
  "pixfs.net",
  "pixnet.cc",
  "pimg.tw",
  "mega.nz",
  "mega.co.nz",
  "sstatic.net",
  "gravatar.com",
  "tiktok.com",
  "tiktokv.com",
  "tiktokcdn.com",
  "hostloc.com",
  "xposed.info",
  "worldjournal.com",

  "pornhub.com",
  "phncdn.com",
  "nsfwmonster.com",
  "spankbang.com",
  "redtube.com",
  "rdtcdn.com",
  "xvideos.com",
  "xvideos2.com",
  "xvideos-cdn.com",
  "aznude.com",
  "pornbest.org",
  "celebjihad.com",
  "deviantart.com",
  "xhamster.com",
  "91porny.com",
  "shemalez.com",
  "youporn.com",
  "xnxx.com",
  "xnxx.com.se",
  "xnxx.health",
  "thisvid.com",
  "redgifs.com",
  "sex.com",
  "thumbzilla.com",
  "vjav.com",
  "pornjam.com",
  "cumlouder.com",
  "missav.com",
  "pornwhite.com",
  "youjizz.com",
  "xfree.com",
  "theyarehuge.com",
  "xgroovy.com",
  "adultempire.com",
  "adultdvdempire.com",
  "gosexpod.com",
  "bigfuck.tv",
  "pornhat.com",
  "pornpics.com",
  "sexvid.xxx",
  "xtits.com",
  "hdteen.porn",
  "eporner.com",
  "damplips.com",
  "xozilla.com",
  "lobstertube.com",
  "faapy.com",
  "nakedgirls.mobi",
  "xcafe.com",
  "qorno.com",
  "hdtube.porn",
  "onlyhentaistuff.com",
  "jkv.app",
];


var isNeedProxy = (function() {
  var domains = {};
  for (var i = 0; i < list.length; i++) {
    domains[list[i]] = null;
  }
  list = null;

  return function(host) {
    if (socksAll) return true;

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
  return isNeedProxy(host) ? ("SOCKS " + socksHost + ":" + socksPort + "; DIRECT") : "DIRECT";
}


if (typeof module !== "undefined") {
  module.exports = {
    "socksHost": socksHost,
    "socksPort": socksPort,
    "isNeedProxy": isNeedProxy
  };
}
