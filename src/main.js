"use strict";
/*
TODO
 * Check chrome API errors
*/
const WINDOW_TYPE_NORMAL = "normal";
const WINDOW_TYPE_POPUP = "popup";

const TAB_ACTIVE = {active: true};
const WINDOW_FOCUS = {focused: true};
const TabPinned = {pinned: false};
const TabMove = {
    index: -1,
    windowId: -1
};
const WindowCreate = {
    focused: false,
    tabId: undefined,
    type: "normal",
    url: undefined,
};

let DOMTemplate = document.getElementById("template").content;
const DOMTemplateDrop = DOMTemplate.children[0];
const DOMTemplateTab = DOMTemplate.children[1];
const DOMTemplateGroup = DOMTemplate.children[2];
const DOMTemplateWindow = DOMTemplate.children[3];
const DOMTemplatePopups = DOMTemplate.children[4];
const DOMTemplateSession = DOMTemplate.children[5];
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
    DOMWindow.windowId = window.id;
    DOMWindow.focused = window.focused;

    if (window.focused) {
        DOMWindow.setAttribute("data-focus", "");
        DOMWindow.setAttribute("open", "");
    }

    return DOMWindow;
};

/**@type{(
 *  DOMTemplateGroup: HTMLElement,
 *  group: chrome.tabGroups.TabGroup
 * ) => HTMLElement}*/
const initDOMGroup = function(DOMGroup, group) {
    DOMGroup.groupId = group.id;
    DOMGroup.groupColor = group.color;
    DOMGroup.windowId = group.windowId;

    DOMGroup.setAttribute("style", "--group-color:var(--"+group.color+")");

    if (group.title !== undefined) {
        DOMGroup.groupTitle = group.title;
        DOMGroup.firstElementChild.setAttribute(
            "title",
            "group | "+ group.title
        );

        DOMGroup.firstElementChild
            .children["title"]
            .lastElementChild
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
    if (type === "normal") {
        if (tab.active) {
            DOMTab.setAttribute("data-active", "");
        }
        if (tab.pinned) {
            DOMTab.setAttribute("data-pin", "");
            DOMTab.setAttribute("draggable", "false");
        }
    }

    DOMTab.tabId = tab.id;
    DOMTab.windowType = type;
    DOMTab.windowId = tab.windowId;
    DOMTab.groupId = tab.groupId;

    const DOMTitle = DOMTab.children["title"].children["title"];
    let title = "";
    if (tab.title !== undefined) {
        DOMTab.tabTitle = tab.title;
        title = tab.title;
        DOMTitle.append(tab.title);
    }

    if (tab.url !== undefined) {
        DOMTab.url = tab.url;
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
        DOMTitle.children["img"].setAttribute("src", tab.favIconUrl);
    } else if (tab.url !== undefined) {
        DOMTitle.children["img"].setAttribute(
            "src",
            chrome.runtime.getURL("/_favicon/")
            + "?pageUrl="+tab.url+"&size=16"
        );
    } else {
        DOMTitle.children["img"].setAttribute("hidden", "");
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
 *  windows: Array<chrome.windows.Window>,
 *  groups: Array<chrome.tabGroups.TabGroup>
 * ) => undefined}*/
const render = function(windows, groups, DOMFragment) {
    let groupId = -1;
    let group = false;
    let popup = false;

    let DOMWindow = undefined;
    let DOMGroup = undefined;
    let DOMPopup = DOMTemplatePopups.cloneNode(true);

    DOMPopup.appendChild(DOMTemplateDrop.cloneNode(true));
    DOMFragment.appendChild(DOMTemplateDrop.cloneNode(true));

    for (let window of windows) {
        if (window.type === WINDOW_TYPE_NORMAL) {
            popup = false;
            DOMWindow = initDOMWindow(
                DOMTemplateWindow.cloneNode(true),
                window
            );
            DOMFragment.appendChild(DOMWindow);
            DOMFragment.appendChild(DOMTemplateDrop.cloneNode(true));
            DOMWindow.children["normal"].appendChild(
                DOMTemplateDrop.cloneNode(true)
            );
        } else if (window.type === WINDOW_TYPE_POPUP) {
            popup = true;
        } else {
            continue;
        }
        for (let tab of window.tabs) {
            if (tab.groupId === -1) {
                group = false;
            } else if (tab.groupId !== groupId) {
                const i = findId(tab.groupId, groups, 0);
                if (i == -1) {
                    throw Error("ERROR: findId");
                }
                groupId = tab.groupId;
                group = true;

                DOMGroup = initDOMGroup(
                    DOMTemplateGroup.cloneNode(true),
                    groups[i]
                );
                DOMWindow.children["normal"].append(
                    DOMGroup,
                    DOMTemplateDrop.cloneNode(true)
                );
                DOMGroup.appendChild(DOMTemplateDrop.cloneNode(true));
            }
            if (group) {
                if (tab.active) {
                    DOMGroup.setAttribute("open", "");
                }
                DOMGroup.append(
                    initDOMTab(DOMTemplateTab.cloneNode(true), tab, "normal"),
                    DOMTemplateDrop.cloneNode(true)
                );
            } else if (popup) {
                DOMPopup.append(
                    initDOMTab(DOMTemplateTab.cloneNode(true), tab, "popup"),
                    DOMTemplateDrop.cloneNode(true)
                );
            } else {
                if (tab.pinned) {
                    DOMWindow.children["pinned"].append(
                        initDOMTab(
                            DOMTemplateTab.cloneNode(true),
                            tab,
                            "normal"
                        )
                    );
                } else {
                    DOMWindow.children["normal"].append(
                        initDOMTab(
                            DOMTemplateTab.cloneNode(true),
                            tab,
                            "normal"
                        ),
                        DOMTemplateDrop.cloneNode(true)
                    );
                }
            }
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

const group = [];

const DOMMainOnclick = function(event) {
    const target = event.target;
    //Tab
    if (target.name === "title") {
        if (event.shiftKey) {
            return;
        } else if (event.ctrlKey) {
            return;
        }
        const DOMTab = target.parentElement;
        let DOMWindow;
        if (DOMTab.parentElement.name === "normal") {
            DOMWindow = DOMTab.parentElement.parentElement;
        } else {
            DOMWindow = DOMTab.parentElement.parentElement.parentElement;
        }

        chrome.tabs.update(DOMTab.tabId, TAB_ACTIVE);

        if (!DOMWindow.focused) {
            chrome.windows.update(DOMTab.windowId, WINDOW_FOCUS);
        }
    } else if (target.name === "unpin") {
        const DOMTab = target.parentElement;
        const DOMNormal = DOMTab.parentElement.nextElementSibling;

        DOMTab.removeAttribute("data-pin");
        DOMTab.setAttribute("draggable", "true");

        DOMNormal.prepend(DOMTab);

        TabPinned.pinned = false;
        chrome.tabs.update(DOMTab.tabId, TabPinned);

    } else if (target.name === "close") {
        if (target.parentElement.hasAttribute("data-tab")) {
            const DOMTab = target.parentElement;
            const id = DOMTab.tabId;
            DOMTab.remove();
            chrome.tabs.remove(id);
            return;
        }
        const DOMParent = target.parentElement.parentElement;
        if (DOMParent.hasAttribute("data-group")) {
            group.length = 0;

            DOMParent.firstElementChild.remove();
            for (let tab of DOMParent.children) {
                const id = tab.tabId;
                if (id !== null) {
                    group.push(id);
                }
            }
            DOMParent.remove();
            chrome.tabs.remove(group);
            return;
        }
        if (DOMParent.hasAttribute("data-window")) {
            const id = DOMParent.windowId;
            if (id !== null) {
                if (!DOMParent.focused) {
                    DOMParent.remove();
                }
                chrome.windows.remove(id);
            }
            return;
        }
    } else if (target.name === "copy") {
        const DOMTab = target.parentElement;
        const url = DOMTab.url;
        if (url !== null) {
            navigator.clipboard.writeText(url);
        }

    //Group
    } else if (target.name === "ungroup") {
        const DOMGroup = target.parentElement.parentElement;
        const DOMPrevTab = DOMGroup.previousElementSibling;

        group.length = 0;
        DOMGroup.firstElementChild.remove();
        for (let tab of DOMGroup.children) {
            const id = tab.tabId;
            if (id !== null) {
                group.push(id);
            }
        }
        Element.prototype.after.apply(
            DOMPrevTab,
            DOMGroup.children
        );
        DOMGroup.remove();

        chrome.tabs.ungroup(group)
    }
};
const DropTemporal = {
    element: undefined,
    id: -1,
    type: "tab",
    currentWindowId: -1,
    groupId: -1,
    index: 0
};


/**@type{(event: DragEvent) => undefined}*/
const DOMContainerOndragstart = function(event) {
    const target = event.target;
    if (target.hasAttribute("data-tab")) {
        const url = target.url;
        if (url !== null) {
            event.dataTransfer.setData("text/uri-list", url);
        }
        if (target.id === undefined) {
            throw Error("ERROR: [data-tab] element not have tabId")
        }
        if (target.windowId === undefined) {
            throw Error("ERROR: [data-tab] element not have windowId");
        }
        if (target.groupId === undefined) {
            throw Error("ERROR: [data-tab] element not have groupId");
        }
        DropTemporal.type = "tab";
        DropTemporal.element = target;
        DropTemporal.id = target.tabId;
        DropTemporal.currentWindowId = target.windowId;
        DropTemporal.groupId = target.groupId;
        event.dataTransfer.effectAllowed = "all"
        DOMContainer.setAttribute("data-dropable", "");

    } else if (target.hasAttribute("data-group")) {
        event.dataTransfer.effectAllowed = "all"
        DropTemporal.element = target;
        DropTemporal.type = "group";

        if (target.groupId === undefined) {
            throw Error("ERROR: [data-tab] element not have groupId");
        }
        DropTemporal.groupId = target.groupId;

        DOMContainer.setAttribute("data-dropable", "");
    }
};

/**@type{(event: DragEvent) => undefined}*/
const DOMContainerOndragend = function() {
    DropTemporal.element = undefined;
    DOMContainer.removeAttribute("data-dropable");
}

/**@type{(event: DragEvent) => undefined}*/
const DOMContainerOndragover = function(event) {
    if (event.target.hasAttribute("data-select")) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move"
    }
};

let timeout = undefined;
const detailsTimeout = function(target) {
    if (!target.parentElement.open) {
        target.parentElement.setAttribute("open", "");
    }
    timeout = undefined;
}

/**@type{(event: DragEvent) => undefined}*/
const DOMContainerOndragenter = function(event) {
    const target = event.target;
    if (timeout !== undefined) {
        clearTimeout(timeout);
    }
    if (target.hasAttribute("data-drop")) {
        event.preventDefault();
        const Prev = target.previousElementSibling;
        const Next = target.nextElementSibling;
        if (Prev !== DropTemporal.element && Next !== DropTemporal.element) {
            target.setAttribute("data-select", "");
        }
    } else if (target.localName === "summary") {
        const DOMParent = target.parentElement;
        if (DropTemporal.element.hasAttribute("data-group")
            && DOMParent.hasAttribute("data-group")
        ) {
            return;
        }
        if (DOMParent.hasAttribute("data-window")
            || DOMParent.hasAttribute("data-group")
            || DOMParent.hasAttribute("data-popups")
        ) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move"
            target.setAttribute("data-select", "");
            if (timeout !== undefined) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(detailsTimeout, 1000, target);
        }
    }
};

/**@type{(event: DragEvent) => undefined}*/
const DOMContainerOndragleave = function(event) {
    const target = event.target;
    if (target.hasAttribute("data-drop")) {
        event.preventDefault();
        target.removeAttribute("data-select", "");
    } else if (target.hasAttribute("data-select")) {
        event.preventDefault();
        target.removeAttribute("data-select", "");
    }
};

/**@type{(event: DragEvent) => undefined}*/
const DOMContainerOndrop = function(event) {
    event.preventDefault();
    const target = event.target;
    if (timeout !== undefined) {
        clearTimeout(timeout);
        timeout = undefined;
    }
    if (target.hasAttribute("data-select")) {
        const DOMParent = target.parentElement;
        target.removeAttribute("data-select");

        if (target.hasAttribute("data-drop")) {
            if (DOMParent.getAttribute("name") === "container") {
                if (DropTemporal.type === "tab") {
                    WindowCreate.focused = false;
                    WindowCreate.tabId = DropTemporal.id;
                    WindowCreate.type = "normal";


                    chrome.windows.create(WindowCreate);
                } else {

                }
            } else if (DOMParent.hasAttribute("data-group")) {
                target.after(
                    DropTemporal.element,
                    DropTemporal.element.nextElementSibling
                );
            } else if (DOMParent.hasAttribute("data-popups")) {
                target.after(
                    DropTemporal.element,
                    DropTemporal.element.nextElementSibling
                );
                //chrome.windows.create()
            } else {
                target.after(
                    DropTemporal.element,
                    DropTemporal.element.nextElementSibling
                );
            }
        } else if (DOMParent.hasAttribute("data-window")) {
            DOMParent.children["normal"].append(
                DropTemporal.element,
                DropTemporal.element.nextElementSibling
            );
            if (DropTemporal.type === "tab") {
                TabMove.index = -1;
                TabMove.windowId = DOMParent.windowId;
                chrome.tabs.move(DropTemporal.id, TabMove);
            }

        } else if (DOMParent.hasAttribute("data-popups")) {
            DOMParent.append(
                DropTemporal.element,
                DropTemporal.element.nextElementSibling
            );
        } else if (DOMParent.hasAttribute("data-group")) {
            DOMParent.append(
                DropTemporal.element,
                DropTemporal.element.nextElementSibling
            );
        }
    }
};


const main = function(promisedata) {
    const windows = promisedata[0];
    const groups = promisedata[1];
    const sessions = promisedata[2];

    console.info({
        groups,
        windows,
        sessions
    });

    DOMContainer.appendChild(
        render(windows, groups, DOMFragment)
    );

    DOMHeaderNav.addEventListener("click", DOMHeaderNavOnclick, false);

    DOMMain.addEventListener("click", DOMMainOnclick, false);
    DOMContainer.addEventListener("dragstart", DOMContainerOndragstart, false);
    DOMContainer.addEventListener("dragend", DOMContainerOndragend, false);
    DOMContainer.addEventListener("dragover", DOMContainerOndragover, false);
    DOMContainer.addEventListener("dragenter", DOMContainerOndragenter, false);
    DOMContainer.addEventListener("dragleave", DOMContainerOndragleave, false);
    DOMContainer.addEventListener("drop", DOMContainerOndrop, false);
};

Promise.all([
    chrome.windows.getAll({
        populate: true,
        windowTypes:[
            WINDOW_TYPE_NORMAL,
            WINDOW_TYPE_POPUP
        ]
    }),
    chrome.tabGroups.query({}),
    chrome.sessions.getDevices()
]).then(main);
