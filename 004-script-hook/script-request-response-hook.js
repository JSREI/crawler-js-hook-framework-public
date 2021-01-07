// ==UserScript==
// @name         script request/response hook
// @namespace    https://github.com/CC11001100/crawler-js-hook-framework-public
// @version      0.2
// @description  用来给script类型的请求打断点
// @author       CC11001100
// @match       *://*/*
// @run-at      document-start
// @grant       none
// ==/UserScript==

(() => {

    /**
     * 使用说明：
     *          用来hook通过script发请求和服务器交互的（多为jsonp），这种打xhr断点没用
     *
     * 使用方式：
     * urlContainsHook: 用来在请求发送之前hook，请求的url中随便复制一点可标识的部分粘贴在这里即可，
     *                    只要检测到script发出的请求的url包含给定的字符串就会hook住进入断点，
     *                      使用场景是url中有加密参数的话就可以往前追溯定位参数怎么来的
     *
     * debuggerBeforeRequestSend:  是否在发送请求前进入断点，如果只需要打response断点的话则手动置为false即可
     *
     * jsonpCallbackFunctionNameParam:  注意服务器的响应内容，如果服务器是返回的callback({foo: bar})形式的，
     *                                  就将callback函数的名字粘贴到这里，适用场景是jsonp回调函数的名字不变
     *
     * jsonpCallbackFunctionNameParam:  用来在接收到服务器响应时进入断点，如果是以jsonp形式交互的，则服务器返回的是一个函数调用的形式，
     *                              具体调用哪个函数是请求参数传递的，这里指定的就是这个参数的名字，会把函数名字替掉添加response断点，
     *                              用于jsonp回调函数每次都会变的，典型的就是jsonp函数名称总有时间戳
     *                              使用场景是如果响应体是加密的可以跟进去看解密逻辑
     *
     */

    const urlContainsHook = "localhost";

    // 如果为true则在请求发送前进入断点，否则请求发送前不进入断点
    // 如果请求参数比较明确，但是返回内容是加密的，这个时候只关注响应是如何处理的，则可以将这个选项置为false
    const debuggerBeforeRequestSend = true;

    // 如果jsonp的回调不是通过参数传递的，而是服务端返回时写死的，看一眼函数的名字，配置在这里，会把这个函数替换掉以插入断点
    const jsonpCallbackFunctionName = "";

    // 如果每次都会变，则只能从参数中取名字
    const jsonpCallbackFunctionNameParam = "";

    const createElementHolder = document.createElement;
    document.createElement = function () {
        const result = createElementHolder.apply(this, arguments);
        if (arguments.length && arguments[0].toLowerCase() === "script") {
            // 在设置src时拦截，然后就可以去追溯src是怎么来的了
            let srcHolder = undefined;
            Object.defineProperty(result, "src", {
                get: () => srcHolder,
                set: newValue => {

                    if (!urlContainsHook || (newValue.indexOf(urlContainsHook) !== -1)) {

                        // 请求时进入断点
                        if (debuggerBeforeRequestSend) {
                            debugger;
                        }

                        // jsonp函数是服务器返回固定写死的hook
                        if (jsonpCallbackFunctionName) {
                            hookFunctionByName(jsonpCallbackFunctionName);
                        }

                        // jsonp的函数名称是每次都不同一直在变的
                        if (jsonpCallbackFunctionNameParam) {
                            const oldJsonFuncName = new URL(newValue).searchParams.get(jsonpCallbackFunctionNameParam);
                            hookFunctionByName(oldJsonFuncName);
                        }

                    }
                    delete result.src;
                    srcHolder = result.src = newValue;
                },
                configurable: true
            });
        }
        return result;
    }

    function hookFunctionByName(functionName) {
        // 因为是要在新的script中调用，所以这些jsonp函数都是全局作用域
        if (!window[functionName]) {
            console.log(`hook失败，函数不存在： ${functionName}`);
            return;
        }

        // 如果已经Hook过了则不重复hook
        const hookDoneFlag = "hookDoneFlag";
        if (window[functionName][hookDoneFlag]) {
            return;
        }
        const holder = window[functionName];
        window[functionName] = () => {
            // 这里是脚本的响应断点，已经拦截到响应，跟进去holder函数就行了
            debugger;
            holder(...arguments);
        }
        window[functionName][hookDoneFlag] = true;
    }

})();