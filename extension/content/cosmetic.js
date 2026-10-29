(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;
  const SELECTOR = [
    "ins.adsbygoogle", '[id^="google_ads"]', '[id^="div-gpt-ad"]', '[id^="ad-slot"]',
    '[class~="ad-banner"]', '[class~="adsbygoogle"]', '[class~="advertisement"]',
    "[data-ad-slot]", "[data-ad-unit]", ".taboola", '[id^="taboola-"]', ".OUTBRAIN"
  ].join(",");
  const seen = new WeakSet();
  let pending = 0, timer = null;

  function flush() {
    timer = null;
    if (!pending) return;
    const count = pending; pending = 0;
    api.runtime.sendMessage({ type: "hidden", count });
  }
  function scan(root) {
    root.querySelectorAll?.(SELECTOR).forEach(el => {
      if (seen.has(el)) return;
      seen.add(el); pending++;
    });
    if (pending && !timer) timer = setTimeout(flush, 500);
  }

  api.runtime.sendMessage({ type: "isWhitelisted", host: location.hostname }).then(res => {
    if (res && res.whitelisted) {
      // Site autorisé : on retire le CSS injecté
      document.querySelectorAll("style[data-b4m]").forEach(s => s.remove());
      const style = document.createElement("style");
      style.dataset.b4m = "1";
      style.textContent = SELECTOR + "{display:revert !important;}";
      (document.head || document.documentElement).appendChild(style);
      return;
    }
    const start = () => {
      scan(document);
      new MutationObserver(m => m.forEach(r => r.addedNodes.forEach(n => n.nodeType === 1 && (n.matches?.(SELECTOR) ? (seen.has(n) || (seen.add(n), pending++, timer || (timer = setTimeout(flush, 500)))) : scan(n)))))
        .observe(document.documentElement, { childList: true, subtree: true });
    };
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start) : start();
  }).catch(() => {});
})();
