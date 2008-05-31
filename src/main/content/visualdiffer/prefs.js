
const VISUALDIFFER_PREF_CONFIG_PATH = "dafizilla.visualdiffer.configPath";

function VisualDifferSessionManager() {
    this._prefBranch = Components.classes['@mozilla.org/preferences-service;1']
                      .getService()
                      .QueryInterface(Components.interfaces.nsIPrefBranch);

    this.sessions = [];
    // The current selected session
    this.selectedIndex = -1;
}

VisualDifferSessionManager.prototype = {
    addSession : function(session) {
        session.manager = this;
        this.sessions.push(session);
    },

    findSessionIndexByName : function(name) {
        for (var i = 0; i < this.sessions.length; i++) {
            if (this.sessions[i].name == name) {
                return i;
            }
        }
        return -1;
    },

    removeSession : function(idx) {
        this.sessions.splice(idx, 1);
    },

    readSessions : function() {
        var f = VisualDifferCommon.makeLocalFile(this.configPath);
        if (!f.exists()) {
            VisualDifferCommon.log("Unable to find file " + this.configPath);
            return;
        }
        var xml = VisualDifferCommon.readFile(this.configPath);
        var parser = new DOMParser();
        var doc = parser.parseFromString(xml, "text/xml");
        if (doc.firstChild.nodeName != "parsererror") {
            this.sessions = this.deserializeSessions(doc);
            this.sortSessions();
        }
    },

    sortSessions : function() {
        this.sessions.sort(this.sortByLastTimeUsed);
    },

    sortByLastTimeUsed : function(a, b) {
        return a.lastTimeUsed == b.lastTimeUsed
            ? 0 : -(a.lastTimeUsed < b.lastTimeUsed ? -1 : 1);
    },

    deserializeSessions : function(doc) {
        var nl = doc.getElementsByTagName("visualdiffer-sessions");
        var ar = [];

        if (nl && nl.item(0) && nl.item(0).hasChildNodes()) {
            nl = nl.item(0).childNodes;
            for (var i = 0; i < nl.length; i++) {
                var curr = nl.item(i);
                var isValid = curr.nodeType == Node.ELEMENT_NODE;

                if (isValid && curr.localName == "session") {
                    var item = this.dom2Session(curr);
                    if (item) {
                        item.manager = this;
                        ar.push(item);
                    }
                }
            }
        }
        return ar;
    },

    dom2Session : function(node) {
        var name = "";
        var lastTimeUsed = 0;
        var leftPath = "";
        var rightPath = "";
        var comparator = null;
        var fileFilter = null;

        if (node.hasChildNodes()) {
            var nl = node.childNodes;

            for (var i = 0; i < nl.length; i++) {
                var curr = nl.item(i);

                var isValid = curr.nodeType == Node.ELEMENT_NODE;

                if (!isValid) {
                    continue;
                }
                if (curr.nodeName == "session-name") {
                    name = curr.firstChild.nodeValue;
                } else if (curr.nodeName == "session-last-time-used") {
                    lastTimeUsed = curr.firstChild.nodeValue;
                } else if (curr.nodeName == "session-left-path") {
                    leftPath = curr.firstChild.nodeValue;
                } else if (curr.nodeName == "session-right-path") {
                    rightPath = curr.firstChild.nodeValue;
                } else if (curr.nodeName == "comparator") {
                    comparator = this.dom2Comparator(curr);
                } else if (curr.nodeName == "file-filter") {
                    fileFilter = this.dom2FileFilter(curr);
                }
            }
        }

        if (name == null || leftPath == null || rightPath == null) {
            return null;
        }
        var data = new VisualDifferSession(leftPath, rightPath);
        data.name = name;
        data.lastTimeUsed = lastTimeUsed == null ? new Date().getTime : parseInt(lastTimeUsed);
        data.comparator = comparator;
        data.fileFilter = fileFilter;

        return data;
    },

    dom2Comparator : function(node) {
        var useTimestamp = false;
        var useSize = false;
        var useContent = false;

        if (node.hasChildNodes()) {
            var nl = node.childNodes;

            for (var i = 0; i < nl.length; i++) {
                var curr = nl.item(i);

                var isValid = curr.nodeType == Node.ELEMENT_NODE;

                if (!isValid) {
                    continue;
                }

                if (curr.nodeName == "comparator-use-timestamp") {
                    useTimestamp = curr.firstChild.nodeValue == "true";
                } else if (curr.nodeName == "comparator-use-size") {
                    useSize = curr.firstChild.nodeValue == "true";
                } else if (curr.nodeName == "comparator-use-content") {
                    useContent = curr.firstChild.nodeValue == "true";
                }
            }
        }

        var data = new VisualDifferComparator();
        data.useTimestamp = useTimestamp;
        data.useSize = useSize;
        data.useContent = false; // not yet used

        return data;
    },

    dom2FileFilter : function(node) {
        var includeFilesArray = null;
        var includeFoldersArray = null;
        var excludeFilesArray = null;
        var excludeFoldersArray = null;

        if (node.hasChildNodes()) {
            var nl = node.childNodes;

            for (var i = 0; i < nl.length; i++) {
                var curr = nl.item(i);

                var isValid = curr.nodeType == Node.ELEMENT_NODE;

                if (!isValid || !curr.hasChildNodes()) {
                    continue;
                }

                if (curr.nodeName == "file-filter-include-files") {
                    includeFilesArray = curr.firstChild.nodeValue.split("\n");
                } else if (curr.nodeName == "file-filter-include-folders") {
                    includeFoldersArray = curr.firstChild.nodeValue.split("\n");
                } else if (curr.nodeName == "file-filter-exclude-files") {
                    excludeFilesArray = curr.firstChild.nodeValue.split("\n");
                } else if (curr.nodeName == "file-filter-exclude-folders") {
                    excludeFoldersArray = curr.firstChild.nodeValue.split("\n");
                }
            }
        }

        var data = new VisualDifferFileFilter();
        data.includeFilesArray = includeFilesArray;
        data.includeFoldersArray = includeFoldersArray;
        data.excludeFilesArray = excludeFilesArray;
        data.excludeFoldersArray = excludeFoldersArray;

        return data;
    },

    buildSessions: function(doc) {
        var nl = doc.getElementsByTagName("session");
        var ar = [];

        if (nl && nl.item(0) && nl.item(0).hasChildNodes()) {
            nl = nl.item(0).childNodes;
            for (var i = 0; i < nl.length; i++) {
                var curr = nl.item(i);
                var isValid = curr.nodeType == Node.ELEMENT_NODE;

                if (isValid && curr.localName == "url-mapper") {
                    var item = this.createUrlMapperData(curr);
                    if (item) {
                        ar.push(item);
                    }
                }
            }
        }
        return ar;
    },

    writeSessions : function() {
        var xml = document.createElement("visualdiffer-sessions");

        for (var i = 0; i < this.sessions.length; i++) {
            xml.appendChild(this.sessions[i].toXml());
        }

        new XMLSerializer().serializeToStream(xml,
                VisualDifferCommon.makeOutputStream(this.configPath),
                "UTF-8");
    },

    get configPath() {
        var configPath = this.getString(VISUALDIFFER_PREF_CONFIG_PATH, null);
        if (configPath == null) {
            var f = VisualDifferCommon.getProfileDir();
            f.append("visualdiffer.xml");
            configPath = f.path;
            this.setString(VISUALDIFFER_PREF_CONFIG_PATH, configPath);
        }
        return configPath;
    },

    getString : function(prefName, defValue) {
        var prefValue;
        try {
            prefValue = this._prefBranch.getCharPref(prefName);
        } catch (ex) {
            prefValue = null;
        }
        return prefValue == null ? defValue : prefValue;
    },

    setString : function(prefName, prefValue) {
        this._prefBranch.setCharPref(prefName, prefValue);
    }
}

