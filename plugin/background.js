// No promotions or advertisements

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === "install") {
        chrome.tabs.create({ url: chrome.runtime.getURL("app.html") })
    } else if (details.reason === "update") {
        console.log(details.previousVersion)
        // Get the first character of the previous version string
        const firstChar = details.previousVersion.charAt(0)
        // Check if the first character is 3, 2, or 1
        if (firstChar === "3" || firstChar === "2" || firstChar === "1") {
            chrome.tabs.create({ url: chrome.runtime.getURL("app.html") })
        }
    }
    chrome.runtime.setUninstallURL("https://link.aipromptgenius.app/general-uninstall")
})

chrome.commands.onCommand.addListener((command, tab) => {
    if (command === "open-sidebar") {
        const chromeVersion = (/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [, 0])[1]
        if (chromeVersion >= 116) {
            chrome.sidePanel.open({ windowId: tab.windowId })
        }
    }
    if (command === "launch-search") {
        console.log("LAUNCHING SEARCH")
        chrome.tabs.create({ url: chrome.runtime.getURL("app.html") })
    }
})
