// ==UserScript==
// @name         JS Cookie Monitor/Debugger Hook
// @namespace    https://github.com/CC11001100/crawler-js-hook-framework-public
// @version      0.6
// @description  用于监控js对cookie的修改，或者在cookie符合给定条件时进入断点
// @document   https://github.com/CC11001100/crawler-js-hook-framework-public/tree/master/001-cookie-hook
// @author       CC11001100
// @match       *://*/*
// @run-at      document-start
// @grant       none
// ==/UserScript==

(() => {

        // 使用文档： https://github.com/CC11001100/crawler-js-hook-framework-public/tree/master/001-cookie-hook

        // @since v0.6 断点规则发生了向后不兼容变化，详情请查阅文档
        const debuggerRules = [];

        // 设置事件断点是否开启，一般保持默认即可
        const enableEventDebugger = {
            "add": true,
            "update": true,
            "delete": false
        }

        // 在控制台打印日志时字体大小，根据自己喜好调整
        // 众所周知，12px是宇宙通用大小
        const consoleLogFontSize = 12;

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

            // 如果过期时间为当前时间之前，则为删除，有可能没设置？虽然目前为止没碰到这样的...
            if (cookiePair.expires !== null && new Date().getTime() >= cookiePair.expires) {
                onDeleteCookie(newValue, cookiePair.name, cookiePair.value || (currentCookieMap.get(cookiePair.name) || {}).value);
                return;
            }

            // 如果之前已经存在，则是修改
            if (currentCookieMap.has(cookiePair.name)) {
                onCookieUpdate(newValue, cookiePair.name, currentCookieMap.get(cookiePair.name).value, cookiePair.value);
                return;
            }

            // 否则则为添加
            onCookieAdd(newValue, cookiePair.name, cookiePair.value);
        }

        function onDeleteCookie(cookieOriginalValue, cookieName, cookieValue) {
            const valueStyle = `color: black; background: #E50000; font-size: ${consoleLogFontSize}px; font-weight: bold;`;
            const normalStyle = `color: black; background: #FF6766; font-size: ${consoleLogFontSize}px;`;

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

            testDebuggerRules(cookieOriginalValue, "delete", cookieName, cookieValue);
        }

        function onCookieUpdate(cookieOriginalValue, cookieName, oldCookieValue, newCookieValue) {

            const cookieValueChanged = oldCookieValue !== newCookieValue;

            if (ignoreUpdateButNotChanged && !cookieValueChanged) {
                return;
            }

            const valueStyle = `color: black; background: #FE9900; font-size: ${consoleLogFontSize}px; font-weight: bold;`;
            const normalStyle = `color: black; background: #FFCC00; font-size: ${consoleLogFontSize}px;`;

            const message = [

                normalStyle,
                now(),

                normalStyle,
                "JS Cookie Monitor: ",

                normalStyle,
                "update cookie, cookieName = ",

                valueStyle,
                `${cookieName}`,

                ...(() => {
                    if (cookieValueChanged) {
                        return [
                            normalStyle,
                            `, oldValue = `,

                            valueStyle,
                            `${oldCookieValue}`,

                            normalStyle,
                            `, newValue = `,

                            valueStyle,
                            `${newCookieValue}`
                        ]
                    } else {
                        return  [
                            normalStyle,
                            `, value = `,

                            valueStyle,
                            `${newCookieValue}`,
                        ];
                    }
                })(),

                normalStyle,
                `, valueChanged = `,

                valueStyle,
                `${cookieValueChanged}`,

                normalStyle,
                `, code location = ${getCodeLocation()}`
            ];
            console.log(genFormatArray(message), ...message);

            testDebuggerRules(cookieOriginalValue, "update", cookieName, newCookieValue);
        }

        function onCookieAdd(cookieOriginalValue, cookieName, cookieValue) {
            const valueStyle = `color: black; background: #669934; font-size: ${consoleLogFontSize}px; font-weight: bold;`;
            const normalStyle = `color: black; background: #65CC66; font-size: ${consoleLogFontSize}px;`;

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

            testDebuggerRules(cookieOriginalValue, "add", cookieName, cookieValue);
        }

// 根据cookie名字判断你是否需要进入断点
        function isNeedDebuggerByCookieName(eventName, cookieName) {

            // 如果没有开启此类事件进入断点，则直接忽略即可
            if (!enableEventDebugger[eventName]) {
                return;
            }

            // 名称完全匹配
            for (let x of debuggerOnChangeAndCookieNameEquals) {
                if (typeof x === "string" && x === cookieName) {
                    debugger;
                } else if (typeof x === "object" && x[eventName] && x[eventName] === cookieName) {
                    debugger;
                }
            }

            // 正则匹配
            for (let x of debuggerOnChangeAndCookieNameRegex) {
                if (x instanceof RegExp && x.test(cookieName)) {
                    debugger;
                } else if (x[eventName] && x[eventName].test(cookieName)) {
                    debugger;
                }
            }
        }

        // 根据cookie值判断是否需要进入断点
        function isNeedDebuggerByCookieValue(eventName, cookieValue) {

            // 如果没有开启此类事件进入断点，则直接忽略即可
            if (!enableEventDebugger[eventName]) {
                return;
            }

            // 此时rule都是DebuggerRule类型的
            for (let rule of debuggerRules) {
                if (rule.eventName && rule.eventName !== eventName) {
                    continue;
                } else if (!rule.cookieValueFilter) {
                    continue;
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
            return new CookiePair(cookieName, cookieValue, expires ? new Date(expires).getTime() : null)
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

        class DebuggerRule {

            constructor(eventName, cookieNameFilter, cookieValueFilter) {
                this.eventName = eventName;
                this.cookieNameFilter = cookieNameFilter;
                this.cookieValueFilter = cookieValueFilter;
            }

            test(eventName, cookieName, cookieValue) {
                return this.testByEventName(eventName) && (this.testByCookieNameFilter(cookieName) || this.testByCookieValueFilter(cookieValue));
            }

            testByEventName(eventName) {
                // 事件不设置则匹配任何事件
                if (!this.eventName) {
                    return true;
                }
                return this.eventName === eventName;
            }

            testByCookieNameFilter(cookieName) {
                if (!cookieName || !this.cookieNameFilter) {
                    return false;
                }
                if (typeof this.cookieNameFilter === "string") {
                    return this.cookieNameFilter === cookieName;
                }
                if (this.cookieNameFilter instanceof RegExp) {
                    return this.cookieNameFilter.test(cookieName);
                }
                return false;
            }

            testByCookieValueFilter(cookieValue) {
                if (!cookieValue || !this.cookieValueFilter) {
                    return false;
                }
                if (typeof this.cookieValueFilter === "string") {
                    return this.cookieValueFilter === cookieValue;
                }
                if (this.cookieValueFilter instanceof RegExp) {
                    return this.cookieValueFilter.test(cookieValue);
                }
                return false;
            }

        }

        // 将规则整理为标准
        (function standardizingRules() {
            const newRules = [];
            while (debuggerRules.length) {
                const rule = debuggerRules.pop();

                // 如果是字符串或者正则
                if (typeof rule === "string" || rule instanceof RegExp) {
                    newRules.push(new DebuggerRule(null, rule, null));
                    continue;
                }

                // 如果是字典对象，则似乎有点麻烦
                for (let key in rule) {
                    let events = null;
                    let cookieNameFilter = null;
                    let cookieValueFilter = null;
                    if (key === "events") {
                        events = rule["events"] || "add|delete|update";
                        cookieNameFilter = rule["name"]
                        cookieValueFilter = rule["value"];
                    } else if (key !== "name" && key !== "value") {
                        events = key;
                        cookieNameFilter = rule[key];
                        cookieValueFilter = rule["value"];
                    } else {
                        // name & value ignore
                        continue;
                    }
                    // cookie的名字是必须配置的
                    if (!cookieNameFilter) {
                        // TODO 提示更友好
                        throw new Error("Cookie Monitor: 规则配置错误");
                    }
                    events.split("|").forEach(eventName => {
                        newRules.push(new DebuggerRule(eventName.trim(), cookieNameFilter, cookieValueFilter));
                    })
                }
            }

            // 是否需要合并重复规则呢？
            // 还是不了，而且静态合并对于正则没办法，用户应该知道自己在做什么

            for (let rule of newRules) {
                debuggerRules.push(rule);
            }
        })();

        /**
         * 当断点停在这里时查看这个方法各个参数的值能够大致了解断点情况
         *
         * @param setCookieOriginalValue 目标网站使用document.cookie时赋值的原始值是什么
         * @param eventName 本次是发生了什么事件，add增加新cookie、update更新cookie的值、delete cookie被删除
         * @param cookieName 本脚本对setCookieOriginalValue解析出的cookie名字
         * @param cookieValue 本脚本对setCookieOriginalValue解析出的cookie值
         */
        function testDebuggerRules(setCookieOriginalValue, eventName, cookieName, cookieValue) {
            for (let rule of debuggerRules) {
                //rule当前的值表示被什么断点规则匹配到了
                if (rule.test(eventName, cookieName, cookieValue)) {
                    debugger;
                }
            }
        }

        class CookiePair {
            constructor(name, value, expires) {
                this.name = name;
                this.value = value;
                this.expires = expires;
            }
        }
    }

)();