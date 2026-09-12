/**
 * Service worker: opens the side panel and nothing else.
 *
 * The panel talks to the content script directly with chrome.tabs.sendMessage,
 * so there is no message relay to keep alive here. MV3 workers are killed
 * aggressively; keeping state in one would be a bug waiting to happen.
 */

chrome.runtime.onInstalled.addListener(() => {
  // Clicking the toolbar icon opens the panel, which is what people expect.
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("[trust-agent] setPanelBehavior:", error));
});
