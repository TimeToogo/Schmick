var url = [location.protocol, '//', location.host, location.pathname].join('');

window.baseUrl = url.substring(0, url.length - "run.html".length);
window.testFrame = $('#test-frame')[0];
window.testWindow = null;
window.testDoc = null;
window.$test = null;

/**
 * Loads the page in the test iframe
 * and returns a deferred instance
 *
 * @param {String} testUrl
 * @returns {Deferred}
 */
function loadPage(testUrl) {

    var deferred = $.Deferred();

    testFrame.onload = function () {
        window.testWindow = testFrame.contentWindow;
        window.testDoc = testWindow.document;
        window.$test = $(testDoc);
        deferred.resolveWith($test);
    };
    testFrame.src = baseUrl + testUrl;


    return deferred;
}