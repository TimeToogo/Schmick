Schmick
=======

Schmick is frontend js library that is designed to provide a slicker navigation experience
for sites that were built on traditional browser navigation such a `<a href="...">` and `<form>` elements.
Schmick will override standard browser behaviour by substituting standard requests with ajax to reload
the page content with custom transition animations.

Schmick relies on relatively newer browser apis but will degrade gracefully if the required api is not
supported by the user's browser.

Usage
=====

Schmick should not require any changes to server side code. Schmick works by replacing
a *container* element on each page load so sites with static headers and footers are most
suitable. You can load schmick with the following code:

```javascript
Schmick.load({
    container: 'body',
    scriptsToReload: [],
    effects: {
        hide: { effect: 'fade', duration: 300 },
        show: { effect: 'fade', duration: 300 }
    }
});
```

Some of the default settings are stated explicitly in the above code. You can remove
any settings you dont need to override.

Example
=======

An example of this library in action can be found on [my personal site](http://elliotswebsite.com/).

Installation
============

You can install the package with bower:

Install via the cli:

```
$ bower install schmick
```

Or, add it to your  `bower.json`:

``` json
    "dependencies": {
        "schmick": "latest"
    }
```

Dependencies
============

Schmick relies on jQuery and jQuery UI.
See [bower.json](bower.json) for details.

Options
=======

Here are the available options for loading the Schmick library:

```javascript
{
    // A css selector to specify the elements to be replaced 
    // with the new content when another page is loaded.
    // Multiple containers can be specified with the css ',' separator.
    // Defaults to body but this will replace the entire page content.
    // If the site contains a static header and footer the page content
    // container would be preferable.
    container: 'body',
    
    // If the site has js scripts to set up functionality for the site
    // you can enter the script src urls here and these will be re-executed
    // on every page load.
    scriptsToReload: [],

    // Links matching this selector are handled by Schmick.
    linkSelector: 'a[href]',

    // Forms matching this selector are handled by Schmick.
    formSelector: 'form',

    // The animation effect options
    // This library uses jQuery UI to perform the animations
    // any options supported by jQuery can be specified here.
    effects: {
        // @see https://api.jqueryui.com/hide/#hide-options
        hide: { effect: 'fade', duration: 300 },
        // @see https://api.jqueryui.com/show/#show-options
        show: { effect: 'fade', duration: 300 }
    },
    
    events: {
        // This will be called when the old page container elements hide
        // animation is complete
        oldPageHidden: function () {},
        
        // This will be called with percentage completion of the 
        // upload progress of the ajax request used to retrieve
        // the new page content
        newPageUploadProgress: function (percentage) { },
        
        // This will be called with percentage completion of the 
        // download progress of the ajax request used to retrieve
        // the new page content
        newPageDownloadProgress: function (percentage) { },
        
        // Called before the container old elements are replaced
        beforeContainersReplaced: function () {},
        
        // Called after the container elements have been replaced
        afterContainersReplaced: function () {},
        
        // Called after the new page container elements show animation
        // is complete
        newPageShown: function () {},
        
        // Called if the new page request was cancelled and the original
        // page is shown again.
        originalPageShown: function () {},
        
        // Called if the ajax request experiences an error
        // @see http://api.jquery.com/jquery.ajax/
        requestError: function (response, textStatus, errorThrown) {}
    }
}
```


Browser Compatibility
=====================

Schmick relies on the following browser apis:

 - [History](http://caniuse.com/#search=pushstate)
 - [FormData](http://caniuse.com/#search=FormData)
 - [DOM Parsing](http://caniuse.com/#search=DOMParser)

If any one of the above is not available, the library will not take effect
and the native browser navigation will be used.

LICENSE
=======

This project is released under the MIT license.
