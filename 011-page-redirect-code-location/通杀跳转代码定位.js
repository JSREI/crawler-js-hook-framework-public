// ==UserScript==
// @name         页面跳转阻断
// @namespace    https://github.com/CC11001100/crawler-js-hook-framework-public/tree/master/011-page-redirect-code-location
// @version      0.1
// @description  阻断页面跳转，留在当前页面分析
// @author       CC11001100
// @match       *://*/*
// @run-at      document-start
// @grant        none
// ==/UserScript==
(() => {

    // 使用说明： https://github.com/CC11001100/crawler-js-hook-framework-public/tree/master/011-page-redirect-code-location

    window.onbeforeunload = () => {
        debugger;
        return false;
    }
})();