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
const Move = {
    index: -1,
    windowId: -1
};
const MoveGroup = {
    index: -1
};

const TabGroup = {
    groupId: -1,
    tabIds: [],
};

const Ids = [];
const PinnedIds = [];

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
 *  id: number,
 *  focused: boolean
 * ) => HTMLElement}*/
const initDOMWindow = function(DOMWindow, id, focused = false) {
    DOMWindow.windowId = id;
    DOMWindow.focused = focused;
    DOMWindow.pinnedtabs = 0;
    DOMWindow.tabchildren = 0;

    if (focused) {
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
    DOMGroup.tabchildren = 0;

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
    if (type === "normal" && tab.pinned) {
        DOMTab.setAttribute("data-pin", "");
        DOMTab.setAttribute("draggable", "false");
    }

    DOMTab.tabId = tab.id;
    DOMTab.groupId = tab.groupId;
    DOMTab.windowId = -1;

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

    if (tab.url !== undefined) {
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

let DOMFocus = undefined;
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

    for (let window of windows) {
        if (window.type === WINDOW_TYPE_NORMAL) {
            popup = false;
            DOMWindow = initDOMWindow(
                DOMTemplateWindow.cloneNode(true),
                window.id,
                window.focused
            );
            DOMFragment.appendChild(DOMWindow);
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
                const DOMTab = initDOMTab(
                    DOMTemplateTab.cloneNode(true),
                    tab,
                    "normal"
                );
                if (tab.active) {
                    DOMGroup.setAttribute("open", "");
                    if (window.focused) {
                        DOMTab.setAttribute("data-active", "");
                    }
                }
                DOMGroup.append(DOMTab, DOMTemplateDrop.cloneNode(true));
                DOMGroup.tabchildren += 1;
                DOMWindow.tabchildren += 1;
            } else if (popup) {
                const DOMTab = initDOMTab(
                    DOMTemplateTab.cloneNode(true),
                    tab,
                    "popup"
                );
                DOMTab.windowId = window.id;
                DOMPopup.append(DOMTab, DOMTemplateDrop.cloneNode(true));
            } else {
                DOMWindow.tabchildren += 1;
                const DOMTab = initDOMTab(
                    DOMTemplateTab.cloneNode(true),
                    tab,
                    "normal"
                );
                if (tab.active && window.focused) {
                    DOMTab.setAttribute("data-active", "");
                    DOMFocus = DOMTab;
                }

                if (tab.pinned) {
                    DOMWindow.children["pinned"].append(DOMTab);
                    DOMWindow.pinnedtabs += 1;
                } else {
                    DOMWindow.children["normal"].append(
                        DOMTab,
                        DOMTemplateDrop.cloneNode(true)
                    );
                }
            }
        }
    }
    DOMFragment.appendChild(DOMPopup);
    return DOMFragment;
};

const getIndexFromWindow = function(children, DropElement, id, start = 0) {
    let i = start;
    for (let child of children) {
        if (child === DropElement) {
            return i;
        } else if (child.hasAttribute("data-tab") && child.tabId !== id) {
            i += 1;
        } else if (child.hasAttribute("data-group") && child.groupId !== id) {
            i += child.tabchildren;
        }
    }
    return -1;
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

const DOMMainOnclick = function(event) {
    const target = event.target;
    if (event.shiftKey) {
        return;
    } else if (event.ctrlKey) {
        return;
    }
    //Tab
    if (target.name === "title") {
        const DOMTab = target.parentElement;
        let DOMWindow;
        if (DOMTab.parentElement.getAttribute("name") === "normal") {
            DOMWindow = DOMTab.parentElement.parentElement;
        } else if (DOMTab.parentElement.hasAttribute("data-group")) {
            DOMWindow = DOMTab.parentElement.parentElement.parentElement;
        } else { //window popups
            DOMWindow = DOMTab.parentElement;
        }

        chrome.tabs.update(DOMTab.tabId, TAB_ACTIVE)

        if (!DOMWindow.focused) {
            if (DOMWindow.hasAttribute("data-popups")) {
                chrome.windows.update(DOMTab.windowId, WINDOW_FOCUS);
            } else {
                chrome.windows.update(DOMWindow.windowId, WINDOW_FOCUS);
            }
        }
    } else if (target.name === "unpin") {
        const DOMTab = target.parentElement;
        const DOMWindow =  DOMTab.parentElement.parentElement;
        const DOMNormal = DOMTab.parentElement.nextElementSibling;

        DOMTab.removeAttribute("data-pin");
        DOMTab.setAttribute("draggable", "true");

        DOMNormal.prepend(DOMTemplateDrop.cloneNode(true), DOMTab);

        DOMWindow.pinnedtabs -= 1;

        TabPinned.pinned = false;
        chrome.tabs.update(DOMTab.tabId, TabPinned);

    } else if (target.name === "close") {
        if (target.parentElement.hasAttribute("data-tab")) {
            const DOMTab = target.parentElement;
            const id = DOMTab.tabId;
            removeFromDragParent(DOMTab.parentElement, 1);
            DOMTab.nextElementSibling.remove();
            DOMTab.remove();
            chrome.tabs.remove(id);
            return;
        }
        const DOMParent = target.parentElement.parentElement;
        if (DOMParent.hasAttribute("data-group")) {
            Ids.length = 0;

            DOMParent.firstElementChild.remove();
            for (let tab of DOMParent.children) {
                const id = tab.tabId;
                if (id !== null) {
                    Ids.push(id);
                }
            }
            removeFromDragParent(DOMParent.parentElement, DOMParent.tabchildren);
            DOMParent.remove();
            chrome.tabs.remove(Ids);
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

        if (Ids.length > 0) {
            Ids.length = 0;
        }

        DOMGroup.firstElementChild.remove();
        for (let tab of DOMGroup.children) {
            const id = tab.tabId;
            if (id !== undefined) {
                Ids.push(id);
            }
        }
        DOMGroup.firstElementChild.remove();
        DOMGroup.lastElementChild.remove();
        Element.prototype.after.apply(
            DOMPrevTab,
            DOMGroup.children
        );
        DOMGroup.remove();

        chrome.tabs.ungroup(Ids);
    }
};

const DragTemporal = {
    DOMElement: undefined,
    DOMParent: undefined,
    id: -1,
    type: "tab",
    groupId: -1,
    index: 0
};

/**@type{(event: DragEvent) => undefined}*/
const DOMMainOndragstart = function(event) {
    const target = event.target;
    console.info(target);
    if (target.hasAttribute("data-tab")) {
        const url = target.url;
        event.dataTransfer.setData("text/uri-list", url);

        DragTemporal.type = "tab";
        DragTemporal.DOMElement = target;
        DragTemporal.DOMParent = target.parentElement;
        DragTemporal.id = target.tabId;
        DragTemporal.groupId = target.groupId;

        target.setAttribute("data-drag", "");
        DOMContainer.setAttribute("data-dropable", "");
        DOMMain.setAttribute("data-new-window", "");

        event.dataTransfer.effectAllowed = "all"

    } else if (target.hasAttribute("data-group")) {
        event.dataTransfer.effectAllowed = "all"

        if (target.open) {
            target.open = false;
        }
        DragTemporal.DOMElement = target;
        DragTemporal.DOMParent = target.parentElement;
        DragTemporal.type = "group";
        DragTemporal.id = target.groupId;
        DragTemporal.groupId = target.groupId;

        target.setAttribute("data-drag", "");
        DOMContainer.setAttribute("data-dropable", "");
        DOMMain.setAttribute("data-new-window", "");

    } else if (target.hasAttribute("data-window")) {
        event.dataTransfer.effectAllowed = "all"
        if (target.open) {
            target.open = false;
        }

        DragTemporal.DOMElement = target;
        DragTemporal.DOMParent = target.parentElement;
        DragTemporal.type = "window";
        DragTemporal.id = target.windowId;

        target.setAttribute("data-drag", "");
        DOMMain.setAttribute("data-dropable", "");
    }
};

/**@type{(event: DragEvent) => undefined}*/
const DOMMainOndragend = function() {
    console.info("DRAG_END");
    if (DragTemporal.DOMElement !== undefined) {
        DragTemporal.DOMElement.removeAttribute("data-drag");
        DOMContainer.removeAttribute("data-dropable");
        DOMMain.removeAttribute("data-new-window");
        DragTemporal.DOMElement = undefined;
        DragTemporal.DOMParent = undefined;
    }
};

/**@type{(event: DragEvent) => undefined}*/
const DOMMainOndragover = function(event) {
    if (event.target.hasAttribute("data-select")) {
        event.preventDefault();
        console.info("DRAG_OVER");
        event.dataTransfer.dropEffect = "move"
    }
};

let timeout = undefined;
const detailsTimeout = function(parentElement) {
    if (!parentElement.open) {
        parentElement.setAttribute("open", "");
    }
    timeout = undefined;
};

/**@type{(event: DragEvent) => undefined}*/
const DOMMainOndragenter = function(event) {
    const target = event.target;
    if (timeout !== undefined) {
        clearTimeout(timeout);
    }
    console.info(target);
    if (!DragTemporal.DOMElement) {
        return;
    }
    if (target.hasAttribute("data-drop")) {
        event.preventDefault();
        console.info("DRAG_ENTER");

        const Prev = target.previousElementSibling;
        const Next = target.nextElementSibling;
        if (Prev === DragTemporal.DOMElement
            || Next === DragTemporal.DOMElement
            || (
                DragTemporal.type === "window"
                && target.parentElement.getAttribute("name") === "container"
            )
            || (
                DragTemporal.type === "tab"
                && DragTemporal.DOMParent.hasAttribute("data-popups")
                && target.parentElement.hasAttribute("data-popups")
            )
        ) {
            return;
        }
        target.setAttribute("data-select", "");
    } else if (target.localName === "summary") {
        const DOMParent = target.parentElement;
        if ((
                DragTemporal.type === "group"
                && DOMParent.hasAttribute("data-group")
                && DOMParent.groupId === DragTemporal.id
            )
            || (
                DragTemporal.type === "window"
                && DOMParent.hasAttribute("data-window")
                && DOMParent.windowId === DragTemporal.id
            )
            || (
                DragTemporal.type === "window"
                && DOMParent.hasAttribute("data-group")
            )
            || (
                DragTemporal.type === "tab"
                && DragTemporal.DOMParent.hasAttribute("data-popups")
                && DOMParent.hasAttribute("data-popups")
            )
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
            if (!DOMParent.open) {
                if (timeout !== undefined) {
                    clearTimeout(timeout);
                }
                timeout = setTimeout(detailsTimeout, 1000, DOMParent);
            }
        }
    }
};

/**@type{(event: DragEvent) => undefined}*/
const DOMMainOndragleave = function(event) {
    const target = event.target;
    if (target.hasAttribute("data-select")) {
        event.preventDefault();
        target.removeAttribute("data-select", "");
    }
};

const removeFromDragParent = function(DragParent, children) {
    let DOMWindow;
    const name = DragParent.getAttribute("name")
    if (name === "normal" || name === "pinned") {
        DOMWindow = DragParent.parentElement;
    } else if (DragParent.hasAttribute("data-group")) {
        DOMWindow = DragParent.parentElement.parentElement;
        DragParent.tabchildren -= children;
    }
    DOMWindow.tabchildren -= children;
    if (DOMWindow.tabchildren === 0) {
        DOMWindow.remove();
        return;
    }
    if (DragParent.hasAttribute("data-group")
        && DragParent.tabchildren === 0
    ) {
        DragParent.nextElementSibling.remove();
        DragParent.remove();
    }
};

const WindowTemporal = {
    DOMElement: undefined,
    DOMDrop: undefined,
    type: "tab",
};
const WindowsCreateWithTab = {
    focused: false,
    tabId: -1,
    type: "normal",
};
const WindowsCreate = {
    focused: false,
    type: "normal",
    url: undefined,
};
const WindowsCreateWithTabCallback = function(window) {
    const DOMWindow = initDOMWindow(
        DOMTemplateWindow.cloneNode(true),
        window.id,
        window.focused
    );
    const DragParent = WindowTemporal.DOMElement.parentElement;
    WindowTemporal.DOMElement.groupId = -1;

    DOMWindow.tabchildren = 1;

    DOMWindow.children["normal"].append(
        DOMTemplateDrop.cloneNode(true),
        WindowTemporal.DOMElement,
        WindowTemporal.DOMElement.nextElementSibling
    );

    DOMContainer.lastElementChild.before(DOMWindow);
    removeFromDragParent(DragParent, 1);

    WindowTemporal.DOMElement = undefined;
    WindowTemporal.DOMDrop = undefined;
};

let emptyTabId = -1;
const removeFirstEmptyTab = function() {
    chrome.tabs.remove(emptyTabId);
};

const WindowsCreateWithGroupCallback = function(window) {
    const DOMWindow = initDOMWindow(
        DOMTemplateWindow.cloneNode(true),
        window.id,
        window.focused
    );
    Move.index = -1;
    Move.windowId = window.id;

    emptyTabId = window.tabs[0].id;
    chrome.tabGroups.move(
        WindowTemporal.element.groupId,
        Move,
        removeFirstEmptyTab
    );

    DOMWindow.tabchildren = WindowTemporal.element.tabchildren;

    const DragParent = WindowTemporal.DOMElement.parentElement;

    DOMWindow.children["normal"].append(
        DOMTemplateDrop.cloneNode(true),
        WindowTemporal.DOMElement,
        WindowTemporal.DOMElement.nextElementSibling
    );

    DOMContainer.lastElementChild.before(DOMWindow);

    removeFromDragParent(DragParent, WindowTemporal.DOMElement.tabchildren);

    WindowTemporal.DOMElement = undefined;
};


const moveDOMWindow = async function(DOMWindow, NewWindow, index = -1) {
    const pinnedtabs = DOMWindow.pinnedtabs;
    Move.index = -1;
    Move.windowId = NewWindow.windowId;
    if (pinnedtabs > 0) {
        if (PinnedIds.length > 0) {
            PinnedIds.length = 0;
        }
        const DOMPinned = DOMWindow.children["pinned"];
        for (let child of DOMPinned.children) {
            if (child.tabId !== undefined) {
                PinnedIds.push(child.tabId);
            }
        }


        await chrome.tabs.move(PinnedIds, Move);
        TabPinned.pinned = true;
        for (let id of PinnedIds) {
           await chrome.tabs.update(id, TabPinned);
        }
        PinnedIds.length = 0;
        if (DOMWindow !== NewWindow) {
            NewWindow.children += pinnedtabs;
            NewWindow.pinnedtabs += pinnedtabs;
            DOMWindow.tabchildren -= pinnedtabs;

            Element.prototype.append.apply(
                NewWindow.children["pinned"],
                DOMPinned.children
            );
        }
    }
    if (DOMWindow.tabchildren > 0) {
        const DOMNormal = DOMWindow.children["normal"];
        if (Ids.length > 0) {
            Ids.length = 0;
        }
        Move.index = index;
        for (let child of DOMNormal.children) {
            if (child.tabId !== undefined) {
                Ids.push(child.tabId);
            } else if (child.hasAttribute("data-group")) {
                await chrome.tabs.move(Ids, Move);
                if (index !== -1) {
                    index += Ids.length;
                    Move.index = index;
                }
                await chrome.tabGroups.move(child.groupId, Move);
                if (index !== -1) {
                    index += child.tabchildren;
                    Move.index = index;
                }
                Ids.length = 0;
            }
        }
        if (Ids.length > 0) {
            await chrome.tabs.move(Ids, Move);
        }

        Ids.length = 0;

        if (DOMWindow !== NewWindow) {
            NewWindow.tabchildren += DOMWindow.tabchildren;
            if (index === 0) {
                DOMNormal.lastElementChild.remove();
                Element.prototype.prepend.apply(
                    NewWindow.children["normal"],
                    DOMNormal.children
                );
            } else if (index !== -1) {
                const DOMNormal = NewWindow.children["normal"];
                let DOMSibling;
                let i = 0;
                for (let child of DOMNormal.children) {
                    if (child.hasAttribute("data-drop")) {
                        if (index === i) {
                            DOMSibling = child;
                            break
                        }
                        i += 1;
                    }
                }
                if (DOMSibling !== undefined) {
                    DOMNormal.firstElementChild.remove();
                    Element.prototype.before.apply(
                        DOMSibling,
                        DOMNormal.children
                    );
                } else {
                    DOMNormal.firstElementChild.remove();
                    Element.prototype.append.apply(
                        NewWindow.children["normal"],
                        DOMNormal.children
                    );
                }
            } else {
                DOMNormal.firstElementChild.remove();
                Element.prototype.append.apply(
                    NewWindow.children["normal"],
                    DOMNormal.children
                );
            }
        }

    }
    if (DOMWindow !== NewWindow) {
        DOMWindow.remove();
    }
};

const createTabPopups = async function(DOMElement, DOMDrop, DOMParent) {
    WindowsCreateWithTab.focused = false;
    WindowsCreateWithTab.type = "popup";
    WindowsCreateWithTab.tabId = DOMElement.tabId;

    const window = await chrome.windows.create(WindowsCreateWithTab);

    DOMElement.windowId = window.id;
    if (DOMParent !== undefined) {
        removeFromDragParent(DOMParent, 1);
    }
    DOMContainer.lastElementChild.append(DOMElement, DOMDrop);
};


/**@type{(event: DragEvent) => undefined}*/
const DOMMainOndrop = function(event) {
    event.preventDefault();
    const target = event.target;
    if (timeout !== undefined) {
        clearTimeout(timeout);
        timeout = undefined;
    }
    if (!target.hasAttribute("data-select")) {
        return
    }
    const DOMParent = target.parentElement;
    target.removeAttribute("data-select");

    if (target.hasAttribute("data-drop-window")) {
        if (DragTemporal.type === "tab") {
            WindowTemporal.DOMElement = DragTemporal.DOMElement;
            WindowTemporal.type = DragTemporal.type;

            WindowsCreateWithTab.focused = false;
            WindowsCreateWithTab.type = "normal";
            WindowsCreateWithTab.tabId = DragTemporal.id;
            chrome.windows.create(
                WindowsCreateWithTab,
                WindowsCreateWithTabCallback
            );
        } else if (DragTemporal.type === "group") {
            WindowTemporal.DOMElement = DragTemporal.DOMElement;
            WindowTemporal.type = DragTemporal.type;

            WindowsCreate.type = "normal";
            chrome.windows.create(
                WindowsCreate,
                WindowsCreateWithGroupCallback
            );
        }
    } else if (target.hasAttribute("data-drop")) {
        if (DOMParent.hasAttribute("data-group")) {
            target.before(
                DragTemporal.DOMElement.previousElementSibling,
                DragTemporal.DOMElement,
            );
        } else if (DOMParent.hasAttribute("data-popups")) {
            if (DragTemporal.type === "tab") {
                target.before(
                    DragTemporal.DOMElement.previousElementSibling,
                    DragTemporal.DOMElement,
                );

            }
        } else if (DOMParent.hasAttribute("data-w-normal")) {
            const DOMWindow = DOMParent.parentElement;
            if (DragTemporal.type === "window") {
                let i = DOMWindow.pinnedtabs;
                for (let child of DOMParent.children) {
                    if (child === target) {
                        moveDOMWindow(DragTemporal.DOMElement, DOMWindow, i);
                        break;
                    } else if (child.hasAttribute("data-tab")) {
                        i += 1;
                    } else if (child.hasAttribute("data-group")) {
                        i += child.tabchildren;
                    }
                }
                moveDOMWindow(DragTemporal.DOMElement, DOMWindow, -1);

            } else {
                let i = 0;
                if (DragTemporal.type === "group") {
                    i = getIndexFromWindow(
                        DOMParent.children,
                        target,
                        DragTemporal.DOMElement.groupId,
                        DOMWindow.pinnedtabs
                    );
                } else {
                    i = getIndexFromWindow(
                        DOMParent.children,
                        target,
                        DragTemporal.DOMElement.tabId,
                        DOMWindow.pinnedtabs
                    );
                }
                if (i === -1) {
                    throw Error("Did not find the id");
                }
                Move.index = i;
                Move.windowId = DOMWindow.windowId;

                let DragWindow;
                if (DragTemporal.DOMParent.hasAttribute("data-group")) {
                    DragWindow = DragTemporal.DOMParent.parentElement.parentElement;
                    chrome.tabs.ungroup(DragTemporal.id);
                    DOMWindow.tabchildren += 1;
                    removeFromDragParent(DragTemporal.DOMParent, 1);
                } else {
                    DragWindow = DragTemporal.DOMParent.parentElement;
                }

                if (DragTemporal.type === "tab") {
                    chrome.tabs.move(DragTemporal.id, Move);
                } else { //"group"
                    if (DragWindow.windowId === DOMWindow.windowId) {
                        MoveGroup.index = i;
                        chrome.tabGroups.move(DragTemporal.id, MoveGroup);
                    } else {
                        chrome.tabGroups.move(DragTemporal.id, Move);
                    }
                }
                if (DragWindow.windowId !== DOMWindow.windowId) {
                    if (DragTemporal.type === "tab") {
                        if (!DragTemporal.DOMParent.hasAttribute("data-popups")) {
                            DOMWindow.tabchildren += 1;
                            removeFromDragParent(DragTemporal.DOMParent, 1);
                        }
                    } else {
                        DOMWindow.tabchildren += DragTemporal.DOMElement.tabchildren;
                        removeFromDragParent(
                            DragTemporal.DOMParent,
                            DragTemporal.DOMParent.tabchildren
                        );
                    }
                }
                target.before(
                    DragTemporal.DOMElement.previousElementSibling,
                    DragTemporal.DOMElement,
                );
            }
        }
    } else if (DOMParent.hasAttribute("data-window")) {
        Move.index = -1;
        Move.windowId = DOMParent.windowId;

        if (DragTemporal.type === "window") {
            if (DragTemporal.id !== DOMParent.windowId) {
                moveDOMWindow(DragTemporal.DOMElement, DOMParent, -1);
            }
        } else {
            if (DragTemporal.type === "tab") {
                chrome.tabs.move(DragTemporal.id, Move);
                if (!DragTemporal.DOMParent.hasAttribute("data-popups")) {
                    removeFromDragParent(DragTemporal.DOMParent, 1);
                }
            } else {//type "group"
                chrome.tabGroups.move(DragTemporal.id, Move);
                removeFromDragParent(DragTemporal.DOMParent, 1);
            }
            DOMParent.children["normal"].append(
                DragTemporal.DOMElement,
                DragTemporal.DOMElement.nextElementSibling,
            );

        }

    } else if (DOMParent.hasAttribute("data-popups")) {
        if (DragTemporal.type === "tab") {
            const DOMElement = DragTemporal.DOMElement;
            createTabPopups(
                DOMElement,
                DOMElement.previousElementSibling,
                DOMElement.parentElement
            );
        } else if (DragTemporal.type === "group") {
            const DOMElement = DragTemporal.DOMElement;
            for (let child of DOMElement.children) {
                if (child.hasAttribute("data-tab")) {
                    createTabPopups(
                        child,
                        child.previousElementSibling,
                        undefined
                    );
                }
            }
            DOMElement.remove();
        } else { //"window"
        }
    } else if (DOMParent.hasAttribute("data-group")) {
        if (DragTemporal.type === "tab") {

            DOMParent.append(
                DragTemporal.DOMElement,
                DragTemporal.DOMElement.previousElementSibling,
            );
        }
    }
    console.info("DROP");

    DragTemporal.DOMElement.removeAttribute("data-drag");
    DOMContainer.removeAttribute("data-dropable");
    DOMMain.removeAttribute("data-new-window");

    DragTemporal.DOMElement = undefined;
    DragTemporal.DOMParent = undefined;
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
    if (DOMFocus !== undefined) {
        DOMFocus.scrollIntoView();
    }

    DOMHeaderNav.addEventListener("click", DOMHeaderNavOnclick, false);

    DOMMain.addEventListener("click", DOMMainOnclick, false);
    DOMMain.addEventListener("dragstart", DOMMainOndragstart, false);
    DOMMain.addEventListener("dragend", DOMMainOndragend, false);
    DOMMain.addEventListener("dragover", DOMMainOndragover, false);
    DOMMain.addEventListener("dragenter", DOMMainOndragenter, false);
    DOMMain.addEventListener("dragleave", DOMMainOndragleave, false);
    DOMMain.addEventListener("drop", DOMMainOndrop, false);
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
