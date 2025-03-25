// Handle extension installation
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === "install") {
        // Open onboarding page on install
        chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
    }
});

// Handle keyboard commands
chrome.commands.onCommand.addListener((command, tab) => {
    if (command === "open-sidebar") {
        const chromeVersion = (/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [, 0])[1];
        if (chromeVersion >= 116) {
            chrome.sidePanel.open({ windowId: tab.windowId });
        }
    }
    if (command === "launch-search") {
        chrome.tabs.create({ url: chrome.runtime.getURL("search.html") });
    }
});