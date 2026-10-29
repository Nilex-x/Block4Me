(() => {
  const AD_KEYS = ["adPlacements", "adSlots", "playerAds"];
  const notify = (count = 1) => window.postMessage({ b4m: "ad-removed", count }, "*");

  function strip(obj) {
    if (!obj || typeof obj !== "object") return obj;
    let removed = 0;
    for (const k of AD_KEYS) {
      if (k in obj) { delete obj[k]; removed++; }
    }
    if (obj.playerResponse) strip(obj.playerResponse);
    if (removed) notify(removed);
    return obj;
  }

  // 1. ytInitialPlayerResponse (chargement initial)
  let initial;
  try {
    Object.defineProperty(window, "ytInitialPlayerResponse", {
      configurable: true,
      get: () => initial,
      set: v => { initial = strip(v); }
    });
  } catch (e) {}

  // 2. JSON.parse (réponses internes)
  const origParse = JSON.parse;
  JSON.parse = function (...args) {
    const data = origParse.apply(this, args);
    try {
      if (data && typeof data === "object" && (data.adPlacements || data.adSlots || data.playerAds || data.playerResponse)) strip(data);
    } catch (e) {}
    return data;
  };

  // 3. fetch vers /youtubei/v1/player et /next
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0] && args[0].url;
      if (url && /\/youtubei\/v1\/(player|next)/.test(url)) {
        const text = await res.clone().text();
        const data = origParse(text);
        strip(data);
        return new Response(JSON.stringify(data), { status: res.status, statusText: res.statusText, headers: res.headers });
      }
    } catch (e) {}
    return res;
  };

  // 4. Filet de sécurité : passer la pub si elle s'affiche quand même
  let lastAd = false;
  function checkPlayer() {
    const player = document.getElementById("movie_player");
    if (!player) return;
    const showing = player.classList.contains("ad-showing");
    if (showing) {
      const video = player.querySelector("video");
      if (video && isFinite(video.duration) && video.duration > 0) {
        video.muted = true;
        video.currentTime = video.duration;
      }
      const skip = player.querySelector(".ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button");
      if (skip) skip.click();
      if (!lastAd) notify(1);
    }
    lastAd = showing;
  }
  new MutationObserver(checkPlayer).observe(document.documentElement, {
    subtree: true, childList: true, attributes: true, attributeFilter: ["class"]
  });
  setInterval(checkPlayer, 500);
})();
