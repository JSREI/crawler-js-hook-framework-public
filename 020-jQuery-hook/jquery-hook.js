// ==UserScript==
// @name         jQuery Hook
// @namespace    https://github.com/CC11001100/crawler-js-hook-framework-public/tree/master/020-jQuery-hook
// @version      0.2
// @description  用于快速定位使用jQuery绑定到DOM元素上的事件的代码的真实位置，辅助逆向分析。
// @document     https://github.com/CC11001100/crawler-js-hook-framework-public/blob/master/020-jQuery-hook/README.md
// @author       CC11001100
// @match       *://*/*
// @run-at      document-start
// @grant       none
// ==/UserScript==
(() => {

    const globalUniqPrefix = "cc11001100";

    // 在第一次设置jquery的时候添加Hook
    Object.defineProperty(window, "$", {
        set: $ => {

            // 为jquery的各种方法添加Hook
            try {
                addHook($);
            } catch (e) {
                console.error("为jQuery添加Hook时报错： " + e)
            }

            // 删除set描述符拦截，恢复正常赋值
            delete window["$"];
            window["$"] = $;
        },
        configurable: true
    });

    /**
     * 为jquery添加一些hook，等会儿使用jquery为dom元素绑定事件的话就会被捕获到
     * @param $
     */
    function addHook($) {

        if (!$["fn"]) {
            console.log("当前页面虽然声明了$变量，但并不是jQuery，因此忽略。");
            return;
        }

        // 一些比较通用的事件的拦截
        const eventNameList = [
            "click", "dblclick", "blur", "change", "contextmenu", "error", "focus",
            "focusin", "focusout", "hover", "holdReady", "proxy", "ready", "keydown", "keypress",
            "keyup", "live", "load", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseout",
            "mouseover", "mouseup"
        ];
        for (let eventName of eventNameList) {
            const old = $.fn[eventName];
            $.fn[eventName] = function () {
                try {
                    setEventFunctionNameToDomObjectAttribute(this, eventName, arguments[0]);
                } catch (e) {
                    console.error(`为jQuery添加${eventName}类型的事件的Hook时发生错误： ${e}`);
                }
                return old.apply(this, arguments);
            }
        }

        // on，不仅是内置事件类型，还有可能有一些自定义的事件类型
        // https://api.jquery.com/on/
        const fnOnHolder = $.fn.on;
        $.fn.on = function () {
            try {
                const eventName = arguments[0];
                let eventFunction = undefined;
                for (let x of arguments) {
                    if (x instanceof Function) {
                        eventFunction = x;
                        break;
                    }
                }
                if (eventFunction instanceof Function) {
                    setEventFunctionNameToDomObjectAttribute(this, eventName, eventFunction);
                }
            } catch (e) {
                console.error(`为jQuery添加on方法的Hook时发生错误： ${e}`);
            }
            return fnOnHolder.apply(this, arguments);
        }

        // TODO 还有delegate之类的比较隐晦的绑定事件的方式

        console.log(`当前页面使用了jQuery，jQuery Hook已初始化完毕。`);
    }

    const addressIdGeneratorMap = {};

    /**
     * 生成一个全局唯一的标识
     * @param eventName
     */
    function globalUnique(eventName) {
        const id = (addressIdGeneratorMap[eventName] || 0) + 1;
        addressIdGeneratorMap[eventName] = id;
        return `${globalUniqPrefix}_${eventName}_${id}`;
    }

    /**
     * 为绑定了jquery事件的dom元素添加元素，提示所绑定的事件与对应的函数代码的全局变量的名称，只需要复制粘贴跟进去即可
     * 注意，有可能会为同一个元素重复绑定相同的事件
     *
     * @param domObject
     * @param eventName
     * @param eventFunction
     */
    function setEventFunctionNameToDomObjectAttribute(domObject, eventName, eventFunction) {
        // TODO bug fix 注意，事件名可能会包含一些非法的字符
        // cc11001100-jquery-$destroy-event-function
        eventName = safeSymbol(eventName);
        const eventFunctionGlobalName = globalUnique(eventName);
        window[eventFunctionGlobalName] = eventFunction;
        const attrName = `${globalUniqPrefix}-jQuery-${eventName}-event-function`;
        if (domObject.attr(attrName)) {
            domObject.attr(attrName + "-" + new Date().getTime(), eventFunctionGlobalName);
        } else {
            domObject.attr(attrName, eventFunctionGlobalName);
        }
    }

    /***
     *
     * @param name
     */
    function safeSymbol(name) {
        const replaceMap = {
            ".": "_dot_",
            "$": "_dollar_",
            "-": "_dash_"
        };
        for (let key of Object.getOwnPropertyNames(replaceMap)) {
            name = name.replace(key, replaceMap[key]);
        }
        return name;
    }

})();

