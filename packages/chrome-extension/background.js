// Background service worker — handles messages from content scripts.

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action !== "openPopup") return;

  // Capture the active tab before the popup window steals focus, so pasteJson
  // can send the paste message to the right tab even though currentWindow will
  // refer to the new popup window once it's open.
  (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.storage.session.set({ targetTabId: tab.id });
    }

    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 460,
      height: 572, // 540px content + ~32px window chrome
      focused: true,
    });
  })();
});
