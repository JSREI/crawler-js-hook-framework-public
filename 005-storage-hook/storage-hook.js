// ==UserScript==
// @name         Storage Monitor/Debugger Hook
// @namespace    https://github.com/CC11001100/crawler-js-hook-framework-public/tree/master/005-storage-hook
// @version      0.1
// @description  用于监控js对localStorage/sessionStorage的任何操作，或者在符合给定条件时进入断点
// @document     https://github.com/CC11001100/crawler-js-hook-framework-public/tree/master/005-storage-hook
// @author       CC11001100
// @match       *://*/*
// @run-at      document-start
// @grant       none
// ==/UserScript==
(() => {

    // 简介： 用于检测、调试浏览器中的localStorage和sessionStorage的任何操作
    // 本工具详细文档见：
    // Storage是什么： https://developer.mozilla.org/zh-CN/docs/Web/API/Storage

    // 修改这里来打断点
    const storageDebuggerList = [
        "947e722bbefb8a455c278113042beadb",

        // 允许使用字符串，字符串用来对name做完全相等的匹配
        // 对LocalStorage或SessionStorage的key为foo-name进行的任何操作都会进入断点
        // "foo-name",

        // 字符串形式的增强版，允许使用正则表达式，正则表达式只用来匹配name
        // /^foo-prefix*/,

        // 这才是一个完整的配置，可以比较精细的打断点
        // {
        //
        //     // storageType { "local" | "session" | "all" }
        //     "storageType": "all",
        //
        //     // operationType { "get" | "set" | "remove" | "clear" | "key" | "all" }
        //     "operationType": "all",
        //
        //     // nameFilter { "string" | RegExp | null }
        //     "nameFilter": "foo-name",
        //
        //     // valueFilter { "string" | RegExp | null }
        //     "valueFilter": "foo-value"
        //
        // }
    ]

    // 可以禁用storage来辅助调试，不需要每次都去傻啦吧唧的删除，让它写不进去读不出来即可
    // 可以这样同时控制localStorage和sessionStorage是否可读和可写
    const enableStorage = {
        read: true,
        write: true
    }

    // 支持的另一种配置方式：
    // 也可以精确的为每一个类型指定可读和可写
    // const enableStorage = {
    //     localStorage: {
    //         // localStorage是否是可读的
    //         read: true,
    //         // localStorage是否是可写的
    //         write: true
    //     },
    //     sessionStorage: {
    //         // sessionStorage是否是可读的
    //         read: true,
    //         // sessionStorage是否是可写的
    //         write: true
    //     }
    // }

    // 在控制台打印日志时字体大小，根据自己喜好调整
    // 众所周知，12px是宇宙通用大小
    const consoleLogFontSize = 12;

    // --------------------------------- 以下为程序内部逻辑，可忽略 ---------------------------------------------

    // 防止重复注入
    const _cc11001100_hook_storage = window._cc11001100_hook_storage = window._cc11001100_hook_storage || {};
    if ("isInjectHook" in _cc11001100_hook_storage) {
        return
    }
    _cc11001100_hook_storage["isInjectHook"] = true

    addHook("session", window.sessionStorage);
    addHook("local", window.localStorage);

    /**
     * 为一个storage对象添加Hook，可以是localStorage或者sessionStorage
     *
     * @param storageTypeName { "local" | "session" }
     * @param storageObject { window.localStorage | window.sessionStorage}
     */
    function addHook(storageTypeName, storageObject) {

        // getItem
        const storageGetItem = storageObject.getItem;
        storageObject.getItem = function (itemName) {
            const itemValue = storageGetItem.apply(this, [itemName]);

            const valueStyle = `color: black; background: #85C1E9; font-size: ${consoleLogFontSize}px; font-weight: bold;`;
            const normalStyle = `color: black; background: #D6EAF8; font-size: ${consoleLogFontSize}px;`;

            const message = [

                normalStyle,
                now(),

                normalStyle,
                "Storage Monitor: ",

                valueStyle,
                "get",

                normalStyle,
                " ",

                valueStyle,
                `${storageTypeName} storage`,

                normalStyle,
                ", name = ",

                valueStyle,
                `${itemName}`,

                normalStyle,
                ", value = ",

                valueStyle,
                `${itemValue}`,

                normalStyle,
                `, code location = ${cc11001100_getCodeLocation()}`
            ];
            console.log(genFormatArray(message), ...message);

            testStorageDebugger(storageTypeName, "get", itemName, itemValue);

            // 如果关闭读功能的话，则阻止其能够读到值
            if (!isStorageEnable(storageTypeName, "read")) {
                const message = [

                    normalStyle,
                    now(),

                    normalStyle,
                    "Storage Monitor: ",

                    normalStyle,
                    "ignore ",

                    valueStyle,
                    "get",

                    normalStyle,
                    ` because disable `,

                    valueStyle,
                    `${storageTypeName}`,

                    normalStyle,
                    " ",

                    valueStyle,
                    "read",

                    normalStyle,
                    `, code location = ${cc11001100_getCodeLocation()}`
                ];
                console.log(genFormatArray(message), ...message);
                return null;
            }



            return itemValue;
        }
        storageObject.getItem.toString = () => "function getItem() { [native code] }";

        // setItem
        const storageSetItem = storageObject.setItem;
        storageObject.setItem = function (itemName, itemValue) {

            const oldValue = storageGetItem.apply(this, [itemName]);

            let valueStyle = "";
            let normalStyle = "";

            if (oldValue == null) {
                // 认为是新增
                valueStyle = `color: black; background: #669934; font-size: ${consoleLogFontSize}px; font-weight: bold;`;
                normalStyle = `color: black; background: #65CC66; font-size: ${consoleLogFontSize}px;`;

                const message = [

                    normalStyle,
                    now(),

                    normalStyle,
                    "Storage Monitor: ",

                    valueStyle,
                    "set",

                    normalStyle,
                    " ",

                    valueStyle,
                    `${storageTypeName} storage`,

                    normalStyle,
                    ", name = ",

                    valueStyle,
                    `${itemName}`,

                    normalStyle,
                    ", value = ",

                    valueStyle,
                    `${itemValue}`,

                    normalStyle,
                    `, code location = ${cc11001100_getCodeLocation()}`
                ];
                console.log(genFormatArray(message), ...message);
            } else {
                // 认为是修改
                valueStyle = `color: black; background: #FE9900; font-size: ${consoleLogFontSize}px; font-weight: bold;`;
                normalStyle = `color: black; background: #FFCC00; font-size: ${consoleLogFontSize}px;`;

                const message = [

                    normalStyle,
                    now(),

                    normalStyle,
                    "Storage Monitor: ",

                    valueStyle,
                    "set",

                    normalStyle,
                    " ",

                    valueStyle,
                    `${storageTypeName} storage`,

                    normalStyle,
                    ", name = ",

                    valueStyle,
                    `${itemName}`,

                    normalStyle,
                    ", newValue = ",

                    valueStyle,
                    `${itemValue}`,

                    ...(() => {
                        if (oldValue === itemValue) {
                            // 值没有发生改变
                            return [
                                normalStyle,
                                ", value changed = ",

                                valueStyle,
                                `false`
                            ]
                        } else {
                            // 值发生了改变
                            return [
                                normalStyle,
                                ", oldValue = ",

                                valueStyle,
                                `${oldValue}`,

                                normalStyle,
                                ", value changed = ",

                                valueStyle,
                                `true`
                            ]
                        }
                    })(),

                    normalStyle,
                    `, code location = ${cc11001100_getCodeLocation()}`
                ];
                console.log(genFormatArray(message), ...message);
            }

            testStorageDebugger(storageTypeName, "set", itemName, itemValue);

            // 如果关闭写功能的话，则阻止其能够修改值
            if (!isStorageEnable(storageTypeName, "write")) {
                const message = [

                    normalStyle,
                    now(),

                    normalStyle,
                    "Storage Monitor: ",

                    normalStyle,
                    "ignore ",

                    valueStyle,
                    "set",

                    normalStyle,
                    ` because disable `,

                    valueStyle,
                    `${storageTypeName}`,

                    normalStyle,
                    " ",

                    valueStyle,
                    "write",

                    normalStyle,
                    `, code location = ${cc11001100_getCodeLocation()}`
                ];
                console.log(genFormatArray(message), ...message);
                return null;
            }

            return storageSetItem.apply(this, [itemName, itemValue]);
        }
        storageObject.setItem.toString = () => "function setItem() { [native code] }";

        // removeItem
        const storageRemoveItem = storageObject.removeItem;
        storageObject.removeItem = function (itemName) {

            const oldValue = storageGetItem.apply(this, [itemName]);

            const valueStyle = `color: black; background: #E50000; font-size: ${consoleLogFontSize}px; font-weight: bold;`;
            const normalStyle = `color: black; background: #FF6766; font-size: ${consoleLogFontSize}px;`;

            const message = [

                normalStyle,
                now(),

                normalStyle,
                "Storage Monitor: ",

                valueStyle,
                "remove",

                normalStyle,
                " ",

                valueStyle,
                `${storageTypeName} storage`,

                normalStyle,
                ", name = ",

                valueStyle,
                `${itemName}`,

                normalStyle,
                ", value = ",

                valueStyle,
                `${oldValue}`,

                normalStyle,
                `, code location = ${cc11001100_getCodeLocation()}`
            ];
            console.log(genFormatArray(message), ...message);

            testStorageDebugger(storageTypeName, "remove", itemName, null);

            // 如果关闭写功能的话，则阻止其能够修改值
            if (!isStorageEnable(storageTypeName, "write")) {
                const message = [

                    normalStyle,
                    now(),

                    normalStyle,
                    "Storage Monitor: ",

                    normalStyle,
                    "ignore ",

                    valueStyle,
                    "remove",

                    normalStyle,
                    ` because disable `,

                    valueStyle,
                    `${storageTypeName}`,

                    normalStyle,
                    " ",

                    valueStyle,
                    "write",

                    normalStyle,
                    `, code location = ${cc11001100_getCodeLocation()}`
                ];
                console.log(genFormatArray(message), ...message);
                return null;
            }

            return storageRemoveItem.apply(this, [itemName]);
        }
        storageObject.removeItem.toString = () => "function removeItem() { [native code] }";

        // clear
        const storageClear = storageObject.clear;
        storageObject.clear = function () {

            const valueStyle = `color: black; background: #E50000; font-size: ${consoleLogFontSize}px; font-weight: bold;`;
            const normalStyle = `color: black; background: #FF6766; font-size: ${consoleLogFontSize}px;`;

            const message = [

                normalStyle,
                now(),

                normalStyle,
                "Storage Monitor: ",

                valueStyle,
                "clear",

                normalStyle,
                " ",

                valueStyle,
                `${storageTypeName} storage`,

                normalStyle,
                `, code location = ${cc11001100_getCodeLocation()}`
            ];
            console.log(genFormatArray(message), ...message);

            testStorageDebugger(storageTypeName, "clear", null, null);

            // 如果关闭写功能的话，则阻止其能够修改值
            if (!isStorageEnable(storageTypeName, "write")) {
                const message = [

                    normalStyle,
                    now(),

                    normalStyle,
                    "Storage Monitor: ",

                    normalStyle,
                    "ignore ",

                    valueStyle,
                    "clear",

                    normalStyle,
                    ` because disable `,

                    valueStyle,
                    `${storageTypeName}`,

                    normalStyle,
                    " ",

                    valueStyle,
                    "write",

                    normalStyle,
                    `, code location = ${cc11001100_getCodeLocation()}`
                ];
                console.log(genFormatArray(message), ...message);
                return null;
            }

            return storageClear.apply(this);
        }
        storageObject.clear.toString = () => "function clear() { [native code] }";

        // key
        const storageKey = storageObject.key;
        storageObject.key = function (itemIndex) {
            const value = storageKey.apply(this, [itemIndex]);

            const valueStyle = `color: black; background: #85C1E9; font-size: ${consoleLogFontSize}px; font-weight: bold;`;
            const normalStyle = `color: black; background: #D6EAF8; font-size: ${consoleLogFontSize}px;`;

            const message = [

                normalStyle,
                now(),

                normalStyle,
                "Storage Monitor: ",

                valueStyle,
                `key`,

                normalStyle,
                " ",

                valueStyle,
                `${storageTypeName} storage`,

                normalStyle,
                `, itemIndex = `,

                valueStyle,
                `${itemIndex}`,

                normalStyle,
                ", value = ",

                valueStyle,
                `${value}`,

                normalStyle,
                `, code location = ${cc11001100_getCodeLocation()}`
            ];
            console.log(genFormatArray(message), ...message);

            testStorageDebugger(storageTypeName, "key", null, value);

            // 如果关闭读功能的话，则阻止其能够读到值
            if (!isStorageEnable(storageTypeName, "read")) {
                const message = [

                    normalStyle,
                    now(),

                    normalStyle,
                    "Storage Monitor: ",

                    normalStyle,
                    "ignore ",

                    valueStyle,
                    "key",

                    normalStyle,
                    ` because disable `,

                    valueStyle,
                    `${storageTypeName}`,

                    normalStyle,
                    " ",

                    valueStyle,
                    "read",

                    normalStyle,
                    `, code location = ${cc11001100_getCodeLocation()}`
                ];
                console.log(genFormatArray(message), ...message);
                return null;
            }

            return value;
        }
        storageObject.key.toString = () => "function key() { [native code] }";

    }

    /**
     * 对应类型的storage是否开启
     *
     * @param storageTypeName { "local" | "session" }
     * @param operationType { "read" | "write" }
     */
    function isStorageEnable(storageTypeName, operationType) {
        if (storageTypeName === "local") {
            return enableStorage["localStorage"][operationType]
        } else if (storageTypeName === "session") {
            return enableStorage["sessionStorage"][operationType]
        } else {
            return true
        }
    }

    /**
     * 测试是否要进入断点
     *
     * @param storageType { "local" | "session" | "all" }
     * @param operationType { "get" | "set" | "remove" | "clear" | "key" | "all" }
     * @param name { "string" | null }
     * @param value { "string" | null }
     */
    function testStorageDebugger(storageType, operationType, name, value) {
        for (let storageDebugger of storageDebuggerList) {
            // 将鼠标移动到这里在变量上悬停查看其值，能够知道是命中了什么规则
            if (storageDebugger.testDebugger(storageType, operationType, name, value)) {
                debugger;
            }
        }
    }

    // 断点规则
    class StorageDebugger {

        /**
         *
         * @param storageType { "local" | "session" | "all" }
         * @param operationType { "get" | "set" | "remove" | "clear" | "key" | "all" }
         * @param nameFilter { "string" | RegExp | null }
         * @param valueFilter { "string" | RegExp | null }
         */
        constructor(storageType, operationType, nameFilter, valueFilter) {
            this.storageType = storageType;
            this.operationType = operationType;
            this.nameFilter = nameFilter;
            this.valueFilter = valueFilter;
        }

        testDebugger(storageType, operationType, name, value) {
            if (!this.testByStorageType(storageType)) {
                return false
            }
            if (!this.testByOperationType(operationType)) {
                return false
            }
            if (this.nameFilter && !this.testByName(name)) {
                return false;
            }
            if (this.valueFilter && !this.testByValue(value)) {
                return false;
            }
            return true;
        }

        testByStorageType(storageType) {
            if (storageType === "all" || this.storageType === "all") {
                return true
            }
            return this.storageType === storageType;
        }

        testByOperationType(operationType) {
            if (operationType === "all" || this.operationType === "all") {
                return true
            }
            return this.operationType === operationType;
        }

        testByName(name) {

            if (!this.nameFilter) {
                return false
            }

            if (!name) {
                return false
            }

            if (typeof this.nameFilter === "string") {
                return this.nameFilter === name;
            } else if (typeof this.nameFilter instanceof RegExp) {
                return this.nameFilter.test(name)
            } else {
                return false;
            }
        }

        testByValue(value) {

            if (!this.valueFilter) {
                return false
            }

            if (!value) {
                return false
            }

            if (typeof this.valueFilter === "string") {
                return this.valueFilter === value;
            } else if (typeof this.valueFilter instanceof RegExp) {
                return this.valueFilter.test(value)
            } else {
                return false;
            }
        }

    }

    // 把storage的读写属性统一，方便后面程序处理
    (function convertEnableStorage() {

        // 设置默认值
        enableStorage["localStorage"] = enableStorage["localStorage"] || {}
        enableStorage["sessionStorage"] = enableStorage["sessionStorage"] || {}

        // 扩展read
        if ("read" in enableStorage) {
            enableStorage["localStorage"]["read"] = enableStorage["read"]
            enableStorage["sessionStorage"]["read"] = enableStorage["read"]
            delete enableStorage["read"]
        }

        // 扩展write
        if ("write" in enableStorage) {
            enableStorage["localStorage"]["write"] = enableStorage["write"]
            enableStorage["sessionStorage"]["write"] = enableStorage["write"]
            delete enableStorage["write"]
        }

        // 如果没有配置的话，则设置默认值
        if (!("write" in enableStorage["localStorage"])) {
            enableStorage["localStorage"]["write"] = true
        }
        if (!("read" in enableStorage["localStorage"])) {
            enableStorage["localStorage"]["read"] = true
        }
        if (!("write" in enableStorage["sessionStorage"])) {
            enableStorage["sessionStorage"]["write"] = true
        }
        if (!("read" in enableStorage["sessionStorage"])) {
            enableStorage["sessionStorage"]["read"] = true
        }

    })();

    // 把storage的断点规则转换为程序内部使用的格式
    (function convertStorageDebugger() {
        // const valueStyle = `color: black; background: #FF2121; font-size: ${Math.round(consoleLogFontSize * 1.5)}px; font-weight: bold;`;
        const normalStyle = `color: black; background: #FF2121; font-size: ${Math.round(consoleLogFontSize * 1.5)}px;`;

        const newStorageDebuggerList = [];
        for (let x of storageDebuggerList) {
            if (typeof x === "string" || x instanceof RegExp) {
                // 如果设置的是名字，则只针对按名称操作的操作打断点
                newStorageDebuggerList.push(new StorageDebugger("all", "get", x, null));
                newStorageDebuggerList.push(new StorageDebugger("all", "set", x, null));
                newStorageDebuggerList.push(new StorageDebugger("all", "remove", x, null));
            } else {

                // 检查设置项的合法性
                if ("storageType" in x && ["local", "session", "all"].indexOf(x["storageType"].toLowerCase()) === -1) {
                    const message = [
                        normalStyle,
                        `${now()} Storage Monitor: storageType error, value = ${x["storageType"]}, need to be = { "local", "session", "all" }, so ignore this debugger = ${JSON.stringify(x)}`,
                    ];
                    console.log(genFormatArray(message), ...message);
                    continue
                }

                if ("operationType" in x && ["get", "set", "remove", "clear", "key", "all"].indexOf(x["operationType"].toLowerCase()) === -1) {
                    const message = [
                        normalStyle,
                        `${now()} Storage Monitor: storageType error, value = ${x["operationType"]}, need to be { "get" | "set" | "remove" | "clear" | "key" | "all" }, so ignore this debugger = ${JSON.stringify(x)}`,
                    ];
                    console.log(genFormatArray(message), ...message);
                    continue
                }

                if (["nameFilter"] in x && (typeof x["nameFilter"] != "string") && !(x["nameFilter"] instanceof RegExp)) {
                    const message = [
                        normalStyle,
                        `${now()} Storage Monitor: nameFilter config error, value = ${x["nameFilter"]}, need to be { string | Regexp | null }, so ignore this debugger = ${JSON.stringify(x)}`,
                    ];
                    console.log(genFormatArray(message), ...message);
                    continue
                }

                if (["valueFilter"] in x && (typeof x["valueFilter"] != "string") && !(x["valueFilter"] instanceof RegExp)) {
                    const message = [
                        normalStyle,
                        `${now()} Storage Monitor: valueFilter config error, value = ${x["valueFilter"]}, need to be { string | Regexp | null }, so ignore this debugger = ${JSON.stringify(x)}`,
                    ];
                    console.log(genFormatArray(message), ...message);
                    continue
                }

                // TODO 出现了其它类型的key，是否配置错误呢？

                const storageType = x["storageType"] || "all";

                if ((x["name"] || x["value"]) && x["operationType"]) {
                    const name = x["name"] || null;
                    const value = x["value"] || null;
                    newStorageDebuggerList.push(new StorageDebugger("all", "get", name, value));
                    newStorageDebuggerList.push(new StorageDebugger("all", "set", name, value));
                    newStorageDebuggerList.push(new StorageDebugger("all", "remove", name, value));
                } else {
                    const operationType = x["operationType"] || "all";
                    const name = x["name"] || null;
                    const value = x["value"] || null;
                    newStorageDebuggerList.push(new StorageDebugger(storageType, operationType, name, value));
                }
            }
        }

        // 把原来的规则替换掉
        while (storageDebuggerList.pop()) {
        }
        for (let x of newStorageDebuggerList) {
            storageDebuggerList.push(x);
        }
    })();

    // 奇奇怪怪的模板方式竟然一路被沿用下来...(*/ω＼*)
    function genFormatArray(messageAndStyleArray) {
        const formatArray = [];
        for (let i = 0, end = messageAndStyleArray.length / 2; i < end; i++) {
            formatArray.push("%c%s");
        }
        return formatArray.join("");
    }

    function now() {
        // 东八区专属...
        return "[" + new Date(new Date().getTime() + 1000 * 60 * 60 * 8).toJSON().replace("T", " ").replace("Z", "") + "] ";
    }

    function cc11001100_getCodeLocation() {
        const callstack = new Error().stack.split("\n");
        while (callstack.length && callstack[0].indexOf("cc11001100_getCodeLocation") === -1) {
            callstack.shift();
        }
        callstack.shift();
        callstack.shift();

        return callstack[0].trim();
    }

})();

