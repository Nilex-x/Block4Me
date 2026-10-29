const api = typeof browser !== "undefined" ? browser : chrome;
const $ = id => document.getElementById(id);

(async () => {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  let host = "";
  try { host = new URL(tab.url).hostname; } catch {}
  $("host").textContent = host || "Page non compatible";
  if (!host) { $("toggle").disabled = true; }

  const wl = await api.runtime.sendMessage({ type: "isWhitelisted", host });
  $("toggle").checked = !wl.whitelisted;

  const s = await api.runtime.sendMessage({ type: "stats", tabId: tab.id });
  $("tab").textContent = s.tab;
  $("total").textContent = s.total;

  $("toggle").addEventListener("change", async () => {
    await api.runtime.sendMessage({ type: "toggle", host });
    api.tabs.reload(tab.id);
  });
  $("reload").addEventListener("click", () => { api.tabs.reload(tab.id); window.close(); });
})();
