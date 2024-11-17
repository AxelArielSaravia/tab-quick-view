"use strict";

const WINDOW_TYPE_NORMAL = "normal";
const WINDOW_TYPE_POPUP = "popup";

let DOMTemplate = document.getElementById("template").content;
const DOMTemplateTab = DOMTemplate.children[0];
const DOMTemplateGroup = DOMTemplate.children[1];
const DOMTemplateWindow = DOMTemplate.children[2];
const DOMTemplatePopups = DOMTemplate.children[3];
const DOMTemplateSession = DOMTemplate.children[4];
DOMTemplate = null;

const DOMFragment = document.createDocumentFragment();
const DOMHeaderNav = document.getElementById("header_nav");
const DOMMain = document.getElementById("main");
const DOMContainer = DOMMain.children["container"];
const DOMMore = DOMMain.children["more"];

/**@type{(
 *  DOMWindow: HTMLElement,
 *  window: chrome.windows.Window
 * ) => HTMLElement}*/
const initDOMWindow = function(DOMWindow, window) {
    const id = String(window.id);
    DOMWindow.setAttribute("data-id", id);

    if (window.focused) {
        DOMWindow.setAttribute("data-focus", "");
        DOMWindow.setAttribute("open", "");
    }

    DOMWindow.firstElementChild
        .children["title"]
        .lastElementChild
        .textContent = id;

    return DOMWindow;
};

/**@type{(
 *  DOMTemplateGroup: HTMLElement,
 *  group: chrome.tabGroups.TabGroup
 * ) => HTMLElement}*/
const initDOMGroup = function(DOMGroup, group) {
    DOMGroup.setAttribute("data-id", String(group.id));
    DOMGroup.setAttribute("data-color", group.color);
    DOMGroup.setAttribute("data-window-id", String(group.windowId));

    DOMGroup.setAttribute("style", "--group-color:var(--"+group.color+")");

    if (group.title !== undefined) {
        DOMGroup.setAttribute("data-title", group.title);
        DOMGroup.firstElementChild.setAttribute("title", "group | "+String(group.title))

        DOMGroup.firstElementChild
            .children["title"]
            .firstElementChild
            .append(group.title);
    }
    return DOMGroup;
};

/**@type{(
 *  DOMTab: HTMLElement,
 *  tab: chrome.tabs.Tab,
 *  type: "normal" | "popup"
 * ) => HTMLElement}*/
const initDOMTab = function(DOMTab, tab, type) {
    DOMTab.setAttribute("data-id", String(tab.id));
    if (type === "normal") {
        if (tab.active) {
            DOMTab.setAttribute("data-active", "");
        }
        if (tab.pinned) {
            DOMTab.setAttribute("data-pin", "");
        }
    } else if (type === "popup") {
        DOMTab.setAttribute("data-window-type", type);
    }

    DOMTab.setAttribute("data-window-id", String(tab.windowId));

    const DOMCTitle = DOMTab.children["title"];
    const DOMTitle = DOMCTitle.children["title"];
    let title = "";
    if (tab.title !== undefined) {
        DOMTab.setAttribute("data-title", tab.title);
        title = tab.title;
        DOMTitle.textContent = tab.title;
    }

    if (tab.url !== undefined) {
        DOMTab.setAttribute("data-url", tab.url);
        if (title.length > 0) {
            title = title+"\n"+tab.url;
        } else {
            title = tab.url;
        }
    }
    if (title.length > 0) {
        DOMTab.setAttribute("title", title);
    }

    if (tab.favIconUrl !== undefined && tab.favIconUrl !== "") {
        DOMCTitle.children["img"].setAttribute("src", tab.favIconUrl);
    } else if (tab.url !== undefined) {
        DOMCTitle.children["img"].setAttribute(
            "src",
            chrome.runtime.getURL("/_favicon/")
            + "?pageUrl="+tab.url+"&size=16"
        );
    } else {
        DOMCTitle.children["img"].setAttribute("hidden", "");
    }

    return DOMTab;
};

/**
 * returns -1 if no id found, otherwise the index
 * @type{(id: number, ids: Array<{id: number}>, start: number) => number}*/
const findId = function(id, ids, start) {
    if (start >= ids.length) {
        return -1;
    }
    for (let i = start; i < ids.length; i += 1) {
        if (ids[i].id === id) {
            return i;
        }
    }
    return -1;
}

/**@type{(
 *  tabs: Array<chrome.tabs.Tab>,
 *  windows: Array<chrome.windows.Window>,
 *  groups: Array<chrome.tabGroups.TabGroup>
 * ) => undefined}*/
const render = function(tabs, windows, groups, DOMFragment) {
    let windowIdx = 0;
    let groupIdx = 0;
    let windowId = -1;
    let groupId = -1;
    let group = false;
    let popup = false;
    let DOMWindow = undefined;
    let DOMGroup = undefined;
    let DOMPopup = DOMTemplatePopups.cloneNode(true);

    for (let tab of tabs) {
        if (windowId !== tab.windowId && windowIdx < windows.length) {
            const i = findId(tab.windowId, windows, windowIdx);
            if (i == -1) {
                throw Error("ERROR: findId");
            }
            windowId = tab.windowId;
            windowIdx = i + 1;
            if (windows[i].type === WINDOW_TYPE_NORMAL) {
                popup = false;
                DOMWindow = initDOMWindow(
                    DOMTemplateWindow.cloneNode(true),
                    windows[i]
                );
                DOMFragment.appendChild(DOMWindow);
            } else if (windows[i].type === WINDOW_TYPE_POPUP) {
                popup = true;
            } else {
                continue;
            }
        }
        if (tab.groupId === -1) {
            group = false;
        } else if (tab.groupId !== groupId
            && groupIdx < groups.length
        ) {
            const i = findId(tab.groupId, groups, groupIdx);
            if (i == -1) {
                throw Error("ERROR: findId");
            }
            DOMGroup = initDOMGroup(
                DOMTemplateGroup.cloneNode(true),
                groups[i]
            );
            if (tab.active) {
                DOMGroup.setAttribute("open", "");
            }
            DOMWindow.appendChild(DOMGroup);
            groupIdx = i + 1;
            groupId = tab.groupId;
            group = true;
        }
        if (group) {
            DOMGroup.appendChild(initDOMTab(
                DOMTemplateTab.cloneNode(true),
                tab,
                "normal"
            ));
        } else if (popup) {
            DOMPopup.appendChild(initDOMTab(
                DOMTemplateTab.cloneNode(true),
                tab,
                "popup"
            ));
        } else {
            DOMWindow.appendChild(initDOMTab(
                DOMTemplateTab.cloneNode(true),
                tab,
                "normal"
            ));
        }
    }
    DOMFragment.appendChild(DOMPopup);
    return DOMFragment;
};

const DOMHeaderNavOnclick = function(event) {
    const target = event.target;
    console.info(target);
    if (target.name === "more") {
        if (DOMMain.getAttribute("data-show") === "more") {
            DOMMain.setAttribute("data-show", "container");
        } else {
            DOMMain.setAttribute("data-show", "more");
        }
    } else if (target.name === "close") {
        globalThis.close();
    }
};

const TAB_ACTIVE = {active: true};
const WINDOW_FOCUS = {focused: true};

const TabPinned = {pinned: false};
const group = [];

const DOMMainOnclick = function(event) {
    const target = event.target;
    //Tab
    if (target.name === "title") {
        const DOMTab = target.parentElement;
        const DOMWindow = DOMTab.parentElement;

        const id = DOMTab.getAttribute("data-id");
        const focus = DOMWindow.hasAttribute("data-focus");

        chrome.tabs.update(Number(id), TAB_ACTIVE);
        if (!focus) {
            const windowId = DOMTab.getAttribute("data-window-id");
            chrome.windows.update(Number(windowId), WINDOW_FOCUS);
        }
    } else if (target.name === "unpin") {
        const DOMTab = target.parentElement;
        const id = DOMTab.getAttribute("data-id");

        DOMTab.removeAttribute("data-pin");

        TabPinned.pinned = false;
        chrome.tabs.update(Number(id), TabPinned);
    } else if (target.name === "close") {
        const DOMTab = target.parentElement;
        const id = DOMTab.getAttribute("data-id");

        DOMTab.remove();

        chrome.tabs.remove(Number(id));
    } else if (target.name === "copy") {
        const DOMTab = target.parentElement;
        const url = DOMTab.getAttribute("data-url");
        if (url !== null) {
            navigator.clipboard.writeText(url);
        }

    //Group
    } else if (target.name === "ungroup") {
        const DOMGroup = target.parentElement;
        const DOMPrevTab = DOMGroup.previousElementSibling;

        for (let tab of DOMGroup.children) {
            const id = tab.getAttribute("data-id");
            if (id !== null) {
                group.push(Number(id));
            }
        }
        DOMGroup.firstElementChild.remove();

        HTMLElement.prototype.after.apply(
            DOMPrevTab,
            DOMGroup.children
        );
        chrome.tabs.ungroup(group)
    }
};

const main = function(promisedata) {
    const tabs = promisedata[0];
    const groups = promisedata[1];
    const windows = promisedata[2];
    const sessions = promisedata[3];

    console.info({
        tabs,
        groups,
        windows,
        sessions
    });

    DOMContainer.appendChild(
        render(tabs, windows, groups, DOMFragment)
    );

    DOMHeaderNav.addEventListener("click", DOMHeaderNavOnclick, false);

    DOMMain.addEventListener("click", DOMMainOnclick, false);
};

Promise.all([
    chrome.tabs.query({}),
    chrome.tabGroups.query({}),
    chrome.windows.getAll({
        populate: true,
        windowTypes:[
            WINDOW_TYPE_NORMAL,
            WINDOW_TYPE_POPUP
        ]
    }),
    chrome.sessions.getDevices()
]).then(main);
