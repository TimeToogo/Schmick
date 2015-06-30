/*!
 * Copyright 2015 Elliot Levin
 * Released under the MIT License
 * https://github.com/TimeToogo/Schmick
 */

window.Schmick = (function(window, $) {
    'use strict';

    /**
     * The Schmick object constructor.
     *
     * @constructor
     */
    function Schmick() {
        var self = this;

        self.defaults = {
            container: 'body',
            scriptsToReload: [],
            linkSelector: 'a[href]',
            formSelector: 'form',
            effects: {
                hide: { effect: 'fade', duration: 300 },
                show: { effect: 'fade', duration: 300 }
            },
            events: {
                oldPageHidden: function () {},
                newPageUploadProgress: function (percentage) { },
                newPageDownloadProgress: function (percentage) { },
                beforeContainersReplaced: function () {},
                afterContainersReplaced: function () {},
                newPageShown: function () {},
                originalPageShown: function () {},
                requestError: function (response, textStatus, errorThrown) {}
            }
        };

        self.options = {};
    }

    var status = {
        NONE: 0,
        LOADING_PAGE: 1
    };

    var schmick = new Schmick();
    var state = {
        status: status.NONE,
        currentXHR: null,
        operationQueue: [],
        queueOperation: function (listener) {
            state.operationQueue.push(listener);
        },
        complete: function () {
            state.status = status.NONE;
            state.currentXHR = null;

            if (state.operationQueue.length > 0) {
                var listener = state.operationQueue[0];
                state.operationQueue = state.operationQueue.slice(1);
                listener();
            }
        }
    };


    /**
     * Loads the Schmick library.
     *
     * This library will intercept clicking links and form submissions replacing
     * the default browser behaviour to unload and reload the page. An equivalent
     * ajax request will be sent and the content of the page will be updated with
     * the matching content from the ajax response.
     *
     * This allows us to display nicer transition animations between page loads
     * without the entire site needing to be built with ajax in mind.
     *
     * @example
     * // The default settings
     * Schmick.load({
     *      container: 'body',
     *      scriptsToReload: [],
     *      linkSelector: 'a[href]',
     *      formSelector: 'form',
     *      effects: {
     *          hide: { effect: 'fade', duration: 300 },
     *          show: { effect: 'fade', duration: 300 }
     *      },
     *      events: {
     *          oldPageHidden: function () {},
     *          newPageUploadProgress: function (percentage) { },
     *          newPageDownloadProgress: function (percentage) { },
     *          beforeContainersReplaced: function () {},
     *          afterContainersReplaced: function () {},
     *          newPageShown: function () {},
     *          originalPageShown: function () {},
     *          requestError: function (response, textStatus, errorThrown) {}
     *      }
     * });
     *
     * @param {Object} options
     * @returns {void}
     */
    Schmick.prototype.load = function (options) {
        if (!Schmick.prototype.supported() || window.__schmick) {
            return;
        }

        if (!options) {
            options = {};
        }

        schmick.options = $.extend(true, {}, schmick.defaults, options);

        $(document).on('click', schmick.options.linkSelector, handleLinkClick);
        $(document).on('submit', schmick.options.formSelector, handleFormSubmission);
        $(window).on('popstate', handlePopState);

        window.__schmick = schmick;
    };


    /**
     * Unloads the Schmick library.
     *
     * @returns {void}
     */
    Schmick.prototype.unload = function () {
        $(document).off('click', handleLinkClick);
        $(document).off('submit', handleFormSubmission);
        $(window).off('popstate', handlePopState);

        window.__schmick = undefined;
    };


    /**
     * Returns whether current browser supports running the
     * schmick library.
     *
     * @returns {Boolean}
     */
    Schmick.prototype.supported = function () {
        if (typeof FormData === 'undefined') {
            return false;
        }

        if (!window.history || !window.history.pushState || !window.history.replaceState ) {
            return false;
        }

        if (typeof DOMParser === 'undefined' && (!window.document.implementation || !window.document.implementation.createHTMLDocument)) {
            return false;
        }

        return true;
    };

    /**
     * Handles a form submission event
     *
     * @param {Object} event The DOM event object
     * @returns {void}
     */
    function handleFormSubmission(event) {
        var form = $(this);

        var method = (form.attr('method') || 'GET').toUpperCase();
        var url = form.attr('action') || window.location.href;

        if (isHandleableElement(form) && isHandleableUrl(url) && isHandleableEvent(event)) {
            event.preventDefault();

            var fallback = {
                type: 'form',
                method: method,
                action: url,
                data: form.serializeArray()
            };

            if (method === 'GET') {
                loadNewPageViaAjax({
                    url: url,
                    method: method,
                    data: form.serialize()
                }, fallback);
            } else {
                loadNewPageViaAjax({
                    url: url,
                    method: method,
                    data: new FormData(form.get(0)),
                    contentType: false,
                    processData: false
                }, fallback);
            }
        }
    }

    /**
     * Emulates an form submission link click
     *
     * @param {String} method
     * @param {String} action
     * @param {Object} data
     * @returns {void}
     */
    function formSubmissionFallback(method, action, data) {
        var form = $('<form>').attr({ method: method, action: action });

        for (var i = 0; i < data.length; i++) {
            form.append($('<input />').attr(data[i]));
        }

        form.appendTo(window.document.body).submit();
    }

    /**
     * Handles a click event on an anchor tag
     *
     * @param {object} event The DOM event object
     * @returns {void}
     */
    function handleLinkClick (event) {
        var link = $(this);
        var url = link.attr('href');

        // Ignore hash of current page, not a link just scrolling
        var hasPos = url.indexOf('#');
        if (hasPos === 0 || (hasPos !== -1 && url.split('#')[0] === window.location.split('#')[0])) {
            return;
        }

        // Ignore non-left clicks and key combinations that open a new tab
        if (event.which !== 1 || event.ctrlKey || event.altKey || event.shiftKey) {
            return;
        }

        if (isHandleableElement(link) && isHandleableUrl(url) && isHandleableEvent(event)) {
            event.preventDefault();

            loadNewPageViaAjax({
                url: url,
                method: 'GET'
            }, {
                type: 'link',
                url: url
            });
        }
    }

    /**
     * Emulates an native link click
     *
     * @param {String} url
     * @returns {void}
     */
    function linkClickFallback(url) {
        window.location = url;
    }

    /**
     * Executes a fallback operation
     *
     * @param {Object} fallback
     * @returns {void}
     */
    function executeFallback(fallback) {
        if (fallback.type === 'link') {
            linkClickFallback(fallback.url);
        }
        if (fallback.type === 'form') {
            formSubmissionFallback(fallback.method, fallback.action, fallback.data);
        }
    }

    /**
     * Handles the onpopstate event
     *
     * @param {object} event The pop state event object
     * @returns {void}
     */
    function handlePopState(event) {
        if (state.status !== status.NONE) {
            state.queueOperation(function () {
                handlePopState(event);
            });
            return;
        }

        var originalEvent = event.originalEvent;
        if (!originalEvent.state || !originalEvent.state.html) {
            return;
        }

        beginLoadNewPage(function () {
            loadNewPage(
                window.document.location,
                originalEvent.state.html,
                originalEvent.state.fallback,
                true // Dont push state
            );
        });
    }

    /**
     * Returns whether the supplied element should be
     *
     * @param {jQuery} element
     * @returns {boolean}
     */
    function isHandleableElement(element) {
        if (element.is('[target]') && element.attr('target') !== '_self') {
            return false;
        }

        return true;
    }

    /**
     * Returns whether the link/form submission event should be handled.
     *
     * @param {object} event
     * @returns {boolean}
     */
    function isHandleableEvent(event) {
        // Ignore previously handled events
        if (event.isDefaultPrevented()) {
            return false ;
        }

        return true;
    }

    /**
     * Returns whether the supplied url can be safely sent an ajax request.
     *
     * @param {string} url
     * @returns {boolean}
     */
    function isHandleableUrl(url) {
        if (url.indexOf(':') !== -1) {
            var protocol = url.split(':')[0].toLowerCase();

            if (protocol !== 'http' && protocol !== 'https') {
                return false;
            }
        }

        var link = $('<a />').attr('href', url).get(0);

        var isRelativeUrl = !(/^https?:\/\//i).test(url);
        var matchesCurrentDomain = (window.location.hostname === link.hostname && window.location.protocol === link.protocol);

        return isRelativeUrl || matchesCurrentDomain;
    }

    /**
     * Loads a new page from the response of an ajax request
     * with the supplied ajax options.
     *
     * @param {Object} ajaxOptions
     * @param {Object} fallback
     * @returns {void}
     */
    function loadNewPageViaAjax(ajaxOptions, fallback) {
        if (state.status !== status.NONE) {
            state.queueOperation(function () {
                loadNewPageViaAjax(ajaxOptions, fallback);
            });
            return;
        }

        var mutex = {
            hasFinishedHidingAnimation: false,
            newPage: { url: '', html: '' }
        };

        var doLoadNewPage = function () {
            if (mutex.hasFinishedHidingAnimation && mutex.newPage.url) {
                loadNewPage(mutex.newPage.url, mutex.newPage.html, fallback);
            }
        };

        beginLoadNewPage(function () {
            mutex.hasFinishedHidingAnimation = true;
            doLoadNewPage();
        });

        // Override the XHR object constructor to
        // remove the X-Requested-With header which
        // indicates this was an ajax request.
        ajaxOptions.xhr = function() {
            var xhr = jQuery.ajaxSettings.xhr();
            var setRequestHeader = xhr.setRequestHeader;

            xhr.setRequestHeader = function(name, value) {
                if (name == 'X-Requested-With') {
                    return;
                }

                setRequestHeader.call(this, name, value);
            };

            // Attach progress event handlers for upload and download events
            var progressCallbackFor = function (callback)  {
                return function (event) {
                    if (event.lengthComputable) {
                        var percentComplete = 100 * event.loaded / event.total;
                        callback(percentComplete);
                    }
                };
            };
            xhr.upload.addEventListener('progress', progressCallbackFor(schmick.options.events.newPageUploadProgress), false);
            xhr.addEventListener('progress', progressCallbackFor(schmick.options.events.newPageDownloadProgress), false);

            return xhr;
        };

        // The response will be parsed separately
        ajaxOptions.dataType = 'text';

        state.currentXHR = $.ajax(ajaxOptions)
            .success(function (html, textStatus, response) {
                // If the response has a content-disposition or the type is not text
                // then this is probably a file download, fall back to normal methods.
                var contentDisposition = response.getResponseHeader('Content-Disposition');
                var contentType = response.getResponseHeader('Content-Type');
                if (contentDisposition || (contentType && contentType.indexOf('text') !== 0)) {
                    cancelLoadNewPage();
                    executeFallback(fallback);
                    return;
                }

                mutex.newPage.url = this.url;
                mutex.newPage.html = html;
                doLoadNewPage();
            })
            .fail(function (response, textStatus, errorThrown) {
                if (textStatus === 'abort') {
                    cancelLoadNewPage();
                    return;
                } else if (!response.responseText) {
                    cancelLoadNewPage();
                    schmick.options.events.requestError(response, textStatus, errorThrown);
                    return;
                }

                mutex.newPage.url = this.url;
                mutex.newPage.html = response.responseText;
                doLoadNewPage();
            });
    }

    /**
     * Begins to load a new page by performing the hide animation
     * on the current page and runs the callback when the animation
     * is complete.
     *
     * @param {Function=} callback
     * @returns {void}
     */
    function beginLoadNewPage(callback) {
        state.status = status.LOADING_PAGE;
        var elements = $(schmick.options.container);
        performAnimation('hide', elements, function () {
            if (callback) {
                callback();
            }
            schmick.options.events.oldPageHidden();
        });
    }

    /**
     * Cancels the loading of a new page by performing the show animation on
     * the current page elements.
     *
     * @param {Function=} callback
     * @returns {void}
     */
    function cancelLoadNewPage(callback) {
        var elements = $(schmick.options.container);
        performAnimation('show', elements, function () {
            if (callback) {
                callback();
            }
            schmick.options.events.originalPageShown();
            state.complete();
        });
    }

    /**
     * Loads a new page.
     *
     * @param {String} url
     * @param {String} html
     * @param {Object} fallback
     * @param {Boolean=} dontPushState
     * @returns {void}
     */
    function loadNewPage(url, html, fallback, dontPushState) {

        var options = schmick.options;

        // Set the current page HTML on the history stack
        // to ensure that the html attribute is consistently
        // available when onpopstate is called
        window.history.replaceState({
            html: window.document.documentElement.outerHTML
        }, document.title, document.location);

        var newDoc = parseResponseIntoHTMLDocument(html);

        // If the document parsing failed, something went wrong with the response
        // or the current parsing api is no good, fallback to standard methods.
        if (!newDoc) {
            executeFallback(fallback);
            return;
        }

        // Perform the replacement with the new container elements while they are hidden
        options.events.beforeContainersReplaced();
        var containerSelector = options.container;
        var containerSelectors = containerSelector.split(',');
        containerSelectors.push('html > head > title');
        try {
            replaceContainerElements(containerSelectors, window.document, newDoc);
        } catch (error) {
            // If there is an element mismatch and the specified
            // selector cannot be replaced, fallback to the root html
            // element.
            containerSelector = 'html';
            replaceContainerElements(['html'], window.document, newDoc);
        }
        options.events.afterContainersReplaced();

        // Find the new container elements and ensure they are hidden
        var elements = $(containerSelector);
        elements.css('display', 'none');

        if (!dontPushState) {
            // Update the history, url and title
            window.history.pushState({ html: html, fallback: fallback }, window.document.title, url);
        }

        // Reload the specified scripts and then perform the show animation
        $.holdReady(true);
        var loadListeners = [];
        startCapturingWindowLoadEvents(loadListeners);
        reloadScripts(options.scriptsToReload, function () {
            stopCapturingWindowLoadEvents();

            performAnimation('show', elements, function () {
                // Now that the document has been updated
                // the document.ready events and window.load events
                // can be fired
                $.holdReady(false);

                var event = window.document.createEvent('Event');
                event.initEvent('load', false, false);

                for (var i = 0; i < loadListeners.length; i++) {
                    loadListeners[i](event);
                }

                if (typeof window.onload === 'Function') {
                    window.onload(event);
                }

                state.complete();
                options.events.newPageShown();
            });
        });
    }

    /**
     * Parses a html string into a DOMDocument object.
     *
     * @param {String} html
     * @returns {Document}
     */
    function parseResponseIntoHTMLDocument(html) {
        if (typeof DOMParser !== 'undefined') {
            var parsedDoc = (new DOMParser()).parseFromString(html, 'text/html');

            if (parsedDoc) {
                 return parsedDoc;
            }
        }

        var doc = window.document.implementation.createHTMLDocument();
        doc.open();
        doc.write(html);
        doc.close();

        return doc;
    }

    /**
     * Performs an animation on the elements using jQuery
     * and will run the callback when all elements have finished
     * animating.
     *
     * @param {String} type The animation method name
     * @param {jQuery} elements
     * @param {Function=} callback The success callback
     */
    function performAnimation(type, elements, callback) {
        callback = callback || function () {};
        var semaphore = elements.length;

        if (semaphore === 0) {
            callback();
            return;
        }

        var animationOptions = $.extend({}, schmick.options.effects[type], {
            complete: function () {
                semaphore--;

                if (semaphore === 0) {
                    callback();
                }
            }
        });

        elements[type](animationOptions);
    }

    /**
     * Loads the array of scripts sequentially.
     *
     * @param {Array} scripts An array of script URLs
     * @param {Function} callback The success callback
     * @param {Number=} i
     *
     * @returns {void}
     */
    function reloadScripts(scripts, callback, i) {
        if (typeof i === 'undefined') {
            i = 0;
        }

        if (i >= scripts.length) {
            callback();
            return;
        }

        var script = scripts[i];

        var newScript = window.document.createElement('script');
        newScript.type = 'text/javascript';
        newScript.src  = script;
        newScript.onload = function() {
            reloadScripts(scripts, callback, i + 1);
        };

        window.document.head.appendChild(newScript);
    }

    /**
     * Replaces the first element for each selector
     * from the old document with the equivalent element
     * from the new document
     *
     * @param {Array} selectors An array of css selectors
     * @param {Document} oldDoc
     * @param {Document} newDoc
     *
     * @returns {void}
     */
    function replaceContainerElements(selectors, oldDoc, newDoc) {
        selectors.forEach(function (selector) {
            var oldElement = oldDoc.querySelector(selector);
            var newElement = newDoc.querySelector(selector);

            if (!oldElement) {
                throw "The container element does not exist in the current document for selector: " + selector;
            }

            if (!newElement) {
                throw "The container element does not exist in the new document for selector: " + selector;
            }

            if (oldElement.isEqualNode(newElement)) {
                return;
            }

            $(oldElement).replaceWith(oldDoc.importNode(newElement, true));
        });
    }

    var originalAddEventListener = window.addEventListener;

    /**
     * Captures the window.load event listeners from this point
     * and adds them to the supplied array.
     *
     * @param {Array} listeners
     * @returns {void}
     */
    function startCapturingWindowLoadEvents(listeners) {
        window.addEventListener = function (type, listener) {
            if (type.toLowerCase() === 'load') {
                listeners.push(listener);
            }

            originalAddEventListener.apply(this, arguments);
        };
    }

    /**
     * Stops capturing any window.load event listeners.
     *
     * @returns {void}
     */
    function stopCapturingWindowLoadEvents() {
        window.addEventListener = originalAddEventListener;
    }

    return schmick;
})(window, jQuery);