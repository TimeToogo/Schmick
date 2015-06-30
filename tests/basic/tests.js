var expect = chai.expect;

// Override transition animations to ensure speedy tests
var animationDuration = 20;

describe('Schmick - Basic', function () {

    function setupSchmick() {
        testWindow.Schmick.options.effects.hide.duration = animationDuration;
        testWindow.Schmick.options.effects.show.duration = animationDuration;
    }

    function getHeader() {
        return $test.find('header').get(0);
    }

    function getContent() {
        return $test.find('section.content').get(0);
    }

    function getUrl() {
        return testWindow.location.href;
    }

    function getFooter() {
        return $test.find('footer').get(0);
    }

    function isCrossOriginError(error) {
        var message = error.message.toLowerCase();
        return message.indexOf('origin') !== -1 || message.indexOf('permission') !== -1;
    }

    function logEventsTo(eventLog)
    {
        var events = testWindow.Schmick.options.events;

        for (var event in events) {
            if (events.hasOwnProperty(event)) {
                events[event] = (function (event) {
                    eventLog.push(event);
                }).bind(this, event);
            }
        }
    }

    describe('Clicking a link', function () {

        beforeEach(function (done) {
            loadPage('basic/index.html').done(function () {
                setupSchmick();
                done();
            });
        });

        describe('to the same page', function () {
            it('should reload the content of page', function (done) {
                var originalHeader = getHeader();
                var originalContent = getContent();
                var originalFooter = getFooter();

                $test.find('a[href="index.html"]')[0].click();

                testWindow.Schmick.options.events.newPageShown = function () {
                    var newHeader = getHeader();
                    var newContent = getContent();
                    var newFooter= getFooter();

                    expect(newContent.innerHTML).to.equal(originalContent.innerHTML);
                    expect(newContent).to.not.equal(originalContent);
                    expect(newContent.innerHTML).to.equal("This is the index page");

                    expect(newHeader).to.equal(originalHeader);
                    expect(newFooter).to.equal(originalFooter);

                    done();
                };
            });

            it('should fire the applicable events', function (done) {
                var events = testWindow.Schmick.options.events;

                var eventsLog = [];
                logEventsTo(eventsLog);

                var shownEventLogger = events.newPageShown;

                $test.find('a[href="index.html"]')[0].click();

                events.newPageShown = function () {
                    shownEventLogger();

                    expect(eventsLog).to.include.members([
                        'oldPageHidden',
                        'beforeContainersReplaced',
                        'afterContainersReplaced',
                        'newPageShown'
                    ]);

                    done();
                };
            });
        });

        describe('to another page', function () {
            it('should reload the content of page', function (done) {
                var originalHeader = getHeader();
                var originalContent = getContent();
                var originalFooter = getFooter();

                $test.find('a[href="second.html"]')[0].click();

                testWindow.Schmick.options.events.newPageShown = function () {
                    var newHeader = getHeader();
                    var newContent = getContent();
                    var newFooter= getFooter();

                    expect(newContent.innerHTML).to.not.equal(originalContent.innerHTML);
                    expect(newContent).to.not.equal(originalContent);
                    expect(newContent.innerHTML).to.equal("This is the second page");

                    expect(newHeader).to.equal(originalHeader);
                    expect(newFooter).to.equal(originalFooter);

                    done();
                };
            });

            it('should update the url', function (done) {
                $test.find('a[href="second.html"]')[0].click();

                testWindow.Schmick.options.events.newPageShown = function () {
                    var url = getUrl();

                    expect(url).to.equal(baseUrl + 'basic/second.html');

                    done();
                };
            });
        });

        describe('to an external page', function () {
            it('should bypass the custom handling', function (done) {
                loadPage('basic/external-link.html').done(function () {

                    testFrame.onload = function () {
                        try {
                            var test = testWindow.document.location;
                        } catch (err) {
                            if (!isCrossOriginError(err)) {
                                throw err.message || 'An error should have been thrown referring to the cross origin iframe request';
                            } else {
                                done();
                            }
                        }
                    };

                    $test.find('a#external-link')[0].click();
                });
            });
        });
    });


    describe('Submitting a form', function () {

        beforeEach(function (done) {
            loadPage('basic/form.html').done(function () {
                setupSchmick();
                done();
            });
        });

        it('should reload the content of page', function (done) {
            $test.find('form[action="results.html"] button[type=submit]')[0].click();

            testWindow.Schmick.options.events.newPageShown = function () {
                var newContent = getContent();

                expect(newContent.innerHTML).to.equal("You entered <span id=\"entered-data\"></span>");
                done();
            };
        });

        it('should update the url', function (done) {
            $test.find('form[action="results.html"] button[type=submit]')[0].click();

            testWindow.Schmick.options.events.newPageShown = function () {
                var url = getUrl();

                expect(url).to.equal(baseUrl + 'basic/results.html?input=');
                done();
            };
        });

        it('should rerun the scripts updating the result span', function (done) {
            var form = $test.find('form[action="results.html"]');
            form.find('input[name=input]').val('some data');
            form.find('button[type=submit]')[0].click();

            testWindow.Schmick.options.events.newPageShown = function () {
                var newContent = getContent();

                expect(newContent.innerHTML).to.equal("You entered <span id=\"entered-data\">some data</span>");

                done();
            };
        });

        describe('to an external page', function () {
            it('should bypass the custom handling', function (done) {
                testFrame.onload = function () {
                    try {
                        var test = testWindow.document.location;
                    } catch (err) {
                        if (!isCrossOriginError(err)) {
                            throw err.message || 'An error should have been thrown referring to the cross origin iframe request';
                        } else {
                            done();
                        }
                    }
                };

                $test.find('form#external-form button[type=submit]')[0].click();
            });
        });
    });


    describe('Pressing the back button', function () {

        beforeEach(function (done) {
            loadPage('basic/index.html').done(function () {
                setupSchmick();

                $test.find('a[href="second.html"]')[0].click();

                testWindow.Schmick.options.events.newPageShown = function () {
                    $test.find('a[href="third.html"]')[0].click();

                    testWindow.Schmick.options.events.newPageShown = function () {
                        testWindow.Schmick.options.events.newPageShown = function () {};
                        done();
                    };
                };
            });
        });

        it('should reload the content of page', function (done) {
            testWindow.history.back();

            testWindow.Schmick.options.events.newPageShown = function () {
                var newContent = getContent();

                expect(newContent.innerHTML).to.equal("This is the second page");
                done();
            };
        });

        it('should update the url', function (done) {
            testWindow.history.back();

            testWindow.Schmick.options.events.newPageShown = function () {
                var url = getUrl();

                expect(url).to.equal(baseUrl + 'basic/second.html');
                done();
            };
        });

        describe('twice', function () {
            this.timeout(3000);

            it('should reload the second then first page content', function (done) {
                testWindow.history.back();
                setTimeout(function () {
                    testWindow.history.back();
                }, animationDuration / 2);

                testWindow.Schmick.options.events.newPageShown = function () {
                    var newContent = getContent();

                    expect(newContent.innerHTML).to.equal("This is the second page");

                    testWindow.Schmick.options.events.newPageShown = function () {
                        var newContent = getContent();

                        expect(newContent.innerHTML).to.equal("This is the index page");
                        done();
                    };
                };
            });

            it('should update the url to the first page', function (done) {
                testWindow.history.back();
                setTimeout(function () {
                    testWindow.history.back();
                }, animationDuration / 2);

                // The browser should update the url immediately
                // but Schmick should load both pages as it catches
                // up with the current state
                testWindow.Schmick.options.events.newPageShown = function () {
                    var url = getUrl();

                    expect(url).to.equal(baseUrl + 'basic/index.html');

                    testWindow.Schmick.options.events.newPageShown = function () {
                        var url = getUrl();

                        expect(url).to.equal(baseUrl + 'basic/index.html');
                        done();
                    };
                };
            });
        });

        after(function () {
            testWindow.Schmick.options.events = testWindow.Schmick.defaults.events;
        });
    });
});