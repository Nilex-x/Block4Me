(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;

  api.runtime.sendMessage({ type: "isWhitelisted", host: location.hostname }).then(res => {
    if (res && res.whitelisted) {
      // Site autorisé : on annule le masquage CSS
      const style = document.createElement("style");
      style.textContent = [
        "ytd-ad-slot-renderer", "ytd-in-feed-ad-layout-renderer", "ytd-promoted-sparkles-web-renderer",
        "ytd-display-ad-renderer", "ytd-banner-promo-renderer", "ytd-merch-shelf-renderer",
        "ytd-rich-item-renderer:has(ytd-ad-slot-renderer)", "#masthead-ad", "#player-ads",
        ".ytp-ad-overlay-container", "ytm-promoted-sparkles-web-renderer", "ad-slot-renderer"
      ].join(",") + "{display:revert !important;}";
      (document.head || document.documentElement).appendChild(style);
      return;
    }

    // Injecte le script dans le contexte de la page
    const s = document.createElement("script");
    s.src = api.runtime.getURL("content/youtube-page.js");
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);

    // Relaye le compteur vers le background
    window.addEventListener("message", e => {
      if (e.source === window && e.data && e.data.b4m === "ad-removed") {
        api.runtime.sendMessage({ type: "hidden", count: e.data.count || 1 }).catch(() => {});
      }
    });
  }).catch(() => {});
})();
