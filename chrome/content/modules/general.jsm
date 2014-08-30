/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = [
    "FIREFOX_ID",
    "THUNDERBIRD_ID",
    "SEAMONKEY_ID",
    "utils",
    "tbUtils"
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");


function getComplexValue(branch, prefName, type) {
    return branch.getComplexValue(prefName, type).data;
}

function setComplexValue(branch, prefName, type, value) {
    let cs = Cc["@mozilla.org/supports-string;1"].createInstance(type);

    cs.data = value;
    branch.setComplexValue(prefName, type, cs);
}


const FIREFOX_ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
const SEAMONKEY_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";


var utils = {

    getComplexCharPref: function(branch, prefName) {
        return getComplexValue(branch, prefName, Ci.nsISupportsString);
    },


    setComplexCharPref: function(branch, prefName, value) {
        setComplexValue(branch, prefName, Ci.nsISupportsString, value);
    },


    getLocalizedCharPref: function(branch, prefName) {
        return getComplexValue(branch, prefName, Ci.nsIPrefLocalizedString);
    },


    setLocalizedCharPref: function(branch, prefName, value) {
        setComplexValue(branch, prefName, Ci.nsIPrefLocalizedString, value);
    },


    isCharPrefLocalized: function(branch, prefName) {
        let value = this.getComplexCharPref(branch, prefName);

        // SOURCE: about:config
        return /^chrome:\/\/.+\/locale\/.+\.properties/.test(value);
    },


    getCharOrLocalizedCharPref: function(branch, prefName) {
        // isCharPrefLocalized() could be used but the next seems faster
        try {
            return this.getLocalizedCharPref(branch, prefName);
        } catch (e) {
            return branch.getCharPref(prefName);
        }
    },


    getDefaultCharPref: function(prefName) {
        let branch = Services.prefs.getDefaultBranch("");

        return branch.getCharPref(prefName);
    },


    isDefaultCharPrefLocalized: function(prefName) {
        let branch = Services.prefs.getDefaultBranch("");

        return this.isCharPrefLocalized(branch, prefName);
    },


    ///////////////////////////////////////////////////////////////////////////
    get os() {
        if (!("_os" in this)) {
            this._os = Services.appinfo.OS.toLowerCase();
        }
        return this._os;
    },


    get application() {
        if (!("_application" in this)) {
            this._application = Services.appinfo.ID;
        }
        return this._application;
    },


    get channel() {
        if (!("_channel" in this)) {
            // COMPAT TODO: use the existent module (Gecko 18 and later):
            //   resource://gre/modules/UpdateChannel.jsm

            // User values for the app.update.channel preference are ignored
            // by the application "for to ensure that the channel is tightly
            // coupled with the application and does not apply to other
            // instances that may use the same profile".
            try {
                this._channel = this.getDefaultCharPref("app.update.channel");
            } catch (e) {
                // Some builds (linux distributions) may not have this
                // preference.
                this._channel = "default";
            }

            // For now, we can to ignore the partnership bits for the channel
            // string.
        }
        return this._channel;
    },


    ///////////////////////////////////////////////////////////////////////////
    getFileContents: function(url) {
        let sis = Cc["@mozilla.org/scriptableinputstream;1"]
                  .getService(Ci.nsIScriptableInputStream);

        let channel = Services.io.newChannel(url, null, null);
        let input = channel.open();
        sis.init(input);

        let contents = sis.read(input.available());

        sis.close();
        input.close();

        return contents;
    },


    openPreferencesWindow: function(parent, url, title) {
        let windows = Services.wm.getEnumerator(null);
        while (windows.hasMoreElements()) {
            let window = windows.getNext();
            if (window.document.documentURI == url) {
                window.focus();

                return;
            }
        }

        let features = "chrome,titlebar,toolbar,centerscreen";
        let instantApply = Services.prefs.getBoolPref(
                                          "browser.preferences.instantApply");
        features += instantApply ? ",dialog=no" : ",modal";

        parent.openDialog(url, title, features);
    }
};


var tbUtils = {

    /**
     * Open an url as a Content Tab. See:
     * https://developer.mozilla.org/en-US/docs/Thunderbird/Content_Tabs
     *
     * SOURCE: /mail/base/content/utilityOverlay.js
     */
    openContentTab: function(url, handlerRegExp) {
        if (!handlerRegExp) {
            let uri = Services.io.newURI(url, null, null);
            handlerRegExp = "^" + uri.prePath;
        }
        let litRegExp = 'new RegExp("' + handlerRegExp + '")';
        let handler = "specialTabs.siteClickHandler(event, " + litRegExp + ");";
        let tabParams = { contentPage: url, clickHandler: handler };

        let tabmail;
        let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
        if (mail3PaneWindow) {
            tabmail = mail3PaneWindow.document.getElementById("tabmail");
            mail3PaneWindow.focus();
        }
        if (tabmail)
            tabmail.openTab("contentTab", tabParams);
        else
            window.openDialog("chrome://messenger/content/", "_blank",
                              "chrome,dialog=no,all", null,
                              { tabType: "contentTab", tabParams: tabParams });
    }
};