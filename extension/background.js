const api = typeof browser !== "undefined" ? browser : chrome;
const WL_KEY = "whitelist";
const TOTAL_KEY = "totalBlocked";
const tabCounts = {};

async function getWhitelist() {
  const d = await api.storage.local.get(WL_KEY);
  return d[WL_KEY] || [];
}

// ID de règle stable à partir du domaine
function ruleId(host) {
  let h = 0;
  for (const c of host) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 100000 + (h % 900000);
}

async function syncDynamicRules() {
  const wl = await getWhitelist();
  const old = await api.declarativeNetRequest.getDynamicRules();
  await api.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: old.map(r => r.id),
    addRules: wl.map(host => ({
      id: ruleId(host),
      priority: 1000,
      action: { type: "allowAllRequests" },
      condition: { requestDomains: [host], resourceTypes: ["main_frame", "sub_frame"] }
    }))
  });
}

function setBadge(tabId) {
  const n = tabCounts[tabId] || 0;
  api.action.setBadgeText({ tabId, text: n ? String(n) : "" });
  api.action.setBadgeBackgroundColor({ tabId, color: "#d93025" });
}

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === "hidden" && sender.tab) {
      const id = sender.tab.id;
      tabCounts[id] = (tabCounts[id] || 0) + msg.count;
      const d = await api.storage.local.get(TOTAL_KEY);
      await api.storage.local.set({ [TOTAL_KEY]: (d[TOTAL_KEY] || 0) + msg.count });
      setBadge(id);
      sendResponse({});
    } else if (msg.type === "isWhitelisted") {
      sendResponse({ whitelisted: (await getWhitelist()).includes(msg.host) });
    } else if (msg.type === "toggle") {
      let wl = await getWhitelist();
      wl = wl.includes(msg.host) ? wl.filter(h => h !== msg.host) : [...wl, msg.host];
      await api.storage.local.set({ [WL_KEY]: wl });
      await syncDynamicRules();
      sendResponse({ whitelisted: wl.includes(msg.host) });
    } else if (msg.type === "stats") {
      const d = await api.storage.local.get(TOTAL_KEY);
      sendResponse({ tab: tabCounts[msg.tabId] || 0, total: d[TOTAL_KEY] || 0 });
    }
  })();
  return true;
});

api.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading") { tabCounts[tabId] = 0; setBadge(tabId); }
});
api.tabs.onRemoved.addListener(id => { delete tabCounts[id]; });
api.runtime.onInstalled.addListener(syncDynamicRules);
