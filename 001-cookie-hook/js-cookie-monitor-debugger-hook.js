// ==UserScript==
// @name         JS Cookie Monitor/Debugger Hook
// @namespace    https://github.com/CC11001100/crawler-js-hook-framework-public
// @version      0.5
// @description  用于监控js对cookie的修改，或者在cookie符合给定条件时进入断点
// @document   https://github.com/CC11001100/crawler-js-hook-framework-public/tree/master/001-cookie-hook
// @author       CC11001100
// @match       *://*/*
// @run-at      document-start
// @grant       none
// ==/UserScript==

(() => {

    // 在cookie的值发生了改变，并且cookie的名字等于任意一个给定的关键词时进入断点
    const debuggerOnChangeAndCookieNameEquals = [];

    // 在cookie的值发生了改变，并且cookie的名字匹配给定的任意一个正则，则进入断点
    const debuggerOnChangeAndCookieNameRegex = [];

    // 在cookie的值发生了改变，并且cookie的值符合任意一个给定的正则，则进入断点
    const debuggerOnChangeAndCookieValueRegex = [];

    // 使用document.cookie更新cookie，但是cookie新的值和原来的值一样，此时要不要忽略这个事件
    const ignoreUpdateButNotChanged = false;

    (function addCookieHook() {
        Object.defineProperty(document, "cookie", {
            get: () => {
                delete document.cookie;
                const currentDocumentCookie = document.cookie;
                addCookieHook();
                return currentDocumentCookie;
            },
            set: newValue => {
                cc11001100_onSetCookie(newValue);
                delete document.cookie;
                document.cookie = newValue;
                addCookieHook();
            },
            configurable: true
        });
    })();

    /**
     * 这个方法的前缀起到命名空间的作用，等下调用栈追溯赋值cookie的代码时需要用这个名字作为终结标志
     *
     * @param newValue
     */
    function cc11001100_onSetCookie(newValue) {
        const cookiePair = parseSetCookie(newValue);
        const currentCookieMap = getCurrentCookieMap();

        // 如果过期时间为当前时间之前，则为删除
        if (cookiePair.expires !== 0 && new Date().getTime() >= cookiePair.expires) {
            onDeleteCookie(cookiePair.name, cookiePair.value || (currentCookieMap.get(cookiePair.name) || {}).value);
            return;
        }

        // 如果之前已经存在，则是修改
        if (currentCookieMap.has(cookiePair.name)) {
            onCookieUpdate(cookiePair.name, currentCookieMap.get(cookiePair.name).value, cookiePair.value);
            return;
        }

        // 否则则为添加
        onCookieAdd(cookiePair.name, cookiePair.value);
    }

    /**
     * 删除cookie
     *
     * @param cookieName
     * @param cookieValue
     */
    function onDeleteCookie(cookieName, cookieValue) {
        const valueStyle = "color: black; background: #E50000; font-size: 13px; font-weight: bold;";
        const normalStyle = "color: black; background: #FF6766; font-size: 13px;";

        const message = [

            normalStyle,
            now(),

            normalStyle,
            "JS Cookie Monitor: ",

            normalStyle,
            "delete cookie, cookieName = ",

            valueStyle,
            `${cookieName}`,

            ...(() => {
                if (!cookieValue) {
                    return [];
                }
               return [
                   normalStyle,
                   ", value = ",

                   valueStyle,
                   `${cookieValue}`,
               ];
            })(),

            normalStyle,
            `, code location = ${getCodeLocation()}`
        ];
        console.log(genFormatArray(message), ...message);

        isNeedDebuggerByCookieName(cookieName);
    }

    /**
     * 更新cookie
     *
     * @param cookieName
     * @param oldCookieValue
     * @param newCookieValue
     */
    function onCookieUpdate(cookieName, oldCookieValue, newCookieValue) {

        const cookieValueChanged = oldCookieValue !== newCookieValue;

        if (ignoreUpdateButNotChanged && !cookieValueChanged) {
            return;
        }

        const valueStyle = "color: black; background: #FE9900; font-size: 13px; font-weight: bold;";
        const normalStyle = "color: black; background: #FFCC00; font-size: 13px;";

        const message = [

            normalStyle,
            now(),

            normalStyle,
            "JS Cookie Monitor: ",

            normalStyle,
            "update cookie, cookieName = ",

            valueStyle,
            `${cookieName}`,

            normalStyle,
            `, oldValue = `,

            valueStyle,
            `${oldCookieValue}`,

            normalStyle,
            `, newValue = `,

            valueStyle,
            `${newCookieValue}`,

            normalStyle,
            `, valueChanged = `,

            valueStyle,
            `${cookieValueChanged}`,

            normalStyle,
            `, code location = ${getCodeLocation()}`
        ];
        console.log(genFormatArray(message), ...message);

        isNeedDebuggerByCookieName(cookieName);
        isNeedDebuggerByCookieValue(newCookieValue);
    }

    /**
     * 添加cookie
     *
     * @param cookieName
     * @param cookieValue
     */
    function onCookieAdd(cookieName, cookieValue) {
        const valueStyle = "color: black; background: #669934; font-size: 13px; font-weight: bold;";
        const normalStyle = "color: black; background: #65CC66; font-size: 13px;";

        const message = [

            normalStyle,
            now(),

            normalStyle,
            "JS Cookie Monitor: ",

            normalStyle,
            "add cookie, cookieName = ",

            valueStyle,
            `${cookieName}`,

            normalStyle,
            ", cookieValue = ",

            valueStyle,
            `${cookieValue}`,

            normalStyle,
            `, code location = ${getCodeLocation()}`
        ];
        console.log(genFormatArray(message), ...message);

        isNeedDebuggerByCookieName(cookieName);
        isNeedDebuggerByCookieValue(cookieValue);
    }

    // 根据cookie名字判断你是否需要进入断点
    function isNeedDebuggerByCookieName(cookieName) {

        // 名称完全匹配
        for(let x of debuggerOnChangeAndCookieNameEquals) {
            if (cookieName === x) {
                debugger;
            }
        }

        // 正则匹配
        for(let x of debuggerOnChangeAndCookieNameRegex) {
            if (x.test(cookieName)) {
                debugger;
            }
        }
    }

    // 根据cookie值判断是否需要进入断点
    function isNeedDebuggerByCookieValue(cookieValue) {
        // 正则匹配
        for(let x of debuggerOnChangeAndCookieValueRegex) {
            if (x.test(cookieValue)) {
                debugger;
            }
        }
    }

    function now() {
        // 东八区专属...
        return "[" + new Date(new Date().getTime() + 1000 * 60 * 60 * 8).toJSON().replace("T", " ").replace("Z", "") + "] ";
    }

    function genFormatArray(messageAndStyleArray) {
        const formatArray = [];
        for (let i = 0, end = messageAndStyleArray.length / 2; i < end; i++) {
            formatArray.push("%c%s");
        }
        return formatArray.join("");
    }

    function getCodeLocation() {
        const callstack = new Error().stack.split("\n");
        while (callstack.length && callstack[0].indexOf("cc11001100") === -1) {
            callstack.shift();
        }
        callstack.shift();
        callstack.shift();

        return callstack[0].trim();
    }

    /**
     * 将本次设置cookie的字符串解析为容易处理的形式
     *
     * @param cookieString
     * @returns {CookiePair}
     */
    function parseSetCookie(cookieString) {
        // uuid_tt_dd=10_37476713480-1609821005397-659114; Expires=Thu, 01 Jan 1025 00:00:00 GMT; Path=/; Domain=.csdn.net;
        const cookieStringSplit = cookieString.split(";");
        const cookieNameValueArray = cookieStringSplit[0].split("=", 2);
        const cookieName = decodeURIComponent(cookieNameValueArray[0].trim());
        const cookieValue = cookieNameValueArray.length > 1 ? decodeURIComponent(cookieNameValueArray[1].trim()) : "";
        const map = new Map();
        for (let i = 1; i < cookieStringSplit.length; i++) {
            const ss = cookieStringSplit[i].split("=", 2);
            const key = ss[0].trim().toLowerCase();
            const value = ss.length > 1 ? ss[1].trim() : "";
            map.set(key, value);
        }
        // 当不设置expires的时候关闭浏览器就过期
        const expires = map.get("expires");
        return new CookiePair(cookieName, cookieValue, expires ? new Date(expires).getTime() : 0)
    }

    /**
     * 获取当前所有已经设置的cookie
     *
     * @returns {Map<string, CookiePair>}
     */
    function getCurrentCookieMap() {
        const cookieMap = new Map();
        if (!document.cookie) {
            return cookieMap;
        }
        document.cookie.split(";").forEach(x => {
            const ss = x.split("=", 2);
            const key = decodeURIComponent(ss[0].trim());
            const value = ss.length > 1 ? decodeURIComponent(ss[1].trim()) : "";
            cookieMap.set(key, new CookiePair(key, value));
        });
        return cookieMap;
    }

    class CookiePair {
        constructor(name, value, expires) {
            this.name = name;
            this.value = value;
            this.expires = expires;
        }
    }

})();