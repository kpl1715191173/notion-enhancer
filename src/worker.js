/*
 * notion-enhancer
 * (c) 2022 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * (https://notion-enhancer.github.io/) under the MIT license
 */

"use strict";

const notionUrl = "https://www.notion.so/",
  isNotionTab = (tab) => tab?.url?.startsWith(notionUrl);

const tabQueue = new Set(),
  openEnhancerMenu = async (tab) => {
    if (!isNotionTab(tab)) {
      const openTabs = await chrome.tabs.query({
        windowId: chrome.windows.WINDOW_ID_CURRENT,
      });
      tab = openTabs.find(isNotionTab);
      tab ??= await chrome.tabs.create({ url: notionUrl });
    }
    chrome.tabs.highlight({ tabs: [tab.index] });
    if (tab.status === "complete") {
      chrome.tabs.sendMessage(tab.id, {
        channel: "notion-enhancer",
        message: "open-menu",
      });
    } else tabQueue.add(tab.id);
  },
  reloadNotionTabs = async () => {
    const openTabs = await chrome.tabs.query({
        windowId: chrome.windows.WINDOW_ID_CURRENT,
      }),
      notionTabs = openTabs.filter(isNotionTab);
    notionTabs.forEach((tab) => chrome.tabs.reload(tab.id));
  };

chrome.action.onClicked.addListener(openEnhancerMenu);
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.channel !== "notion-enhancer") return;
  if (sender.tab && msg.message === "load-complete") {
    if (tabQueue.has(sender.tab.id)) {
      chrome.tabs.sendMessage(sender.tab.id, {
        channel: "notion-enhancer",
        message: "open-menu",
      });
      tabQueue.delete(sender.tab.id);
    }
  } else if (msg.message === "reload-app") {
    reloadNotionTabs();
  }
  return true;
});
