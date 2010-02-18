
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
            this.sessions = this._deserializeSessions(doc);
            this.sortSessions();
        } else {
            VisualDifferCommon.log("Error while reading "
                                + this.configPath
                                + " "
                                + doc.firstChild.firstChild.nodeValue);
        }
    },

    sortSessions : function() {
        this.sessions.sort(this._nameSorter);
    },

    _nameSorter : function(a, b) {
        return VisualDifferCommon.compareTo(a.name.toLowerCase(), b.name.toLowerCase());
    },

    _deserializeSessions : function(doc) {
        var nl = doc.getElementsByTagName("visualdiffer-sessions");
        var ar = [];

        if (nl && nl.item(0) && nl.item(0).hasChildNodes()) {
            nl = nl.item(0).childNodes;
            for (var i = 0; i < nl.length; i++) {
                var curr = nl.item(i);
                var isValid = curr.nodeType == Node.ELEMENT_NODE;

                if (isValid && curr.localName == "session") {
                    var item = this._dom2Session(curr);
                    if (item) {
                        item.manager = this;
                        ar.push(item);
                    }
                }
            }
        }
        return ar;
    },

    _dom2Session : function(node) {
        var name = "";
        var leftPath = "";
        var rightPath = "";
        var comparator = null;
        var fileFilter = null;
        var displayFilters = null;
        var expandAll = null;

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
                } else if (curr.nodeName == "session-left-path") {
                    leftPath = curr.firstChild.nodeValue;
                } else if (curr.nodeName == "session-right-path") {
                    rightPath = curr.firstChild.nodeValue;
                } else if (curr.nodeName == "session-display-filter") {
                    displayFilters = parseInt(curr.firstChild.nodeValue);
                } else if (curr.nodeName == "session-expand-all") {
                    expandAll = curr.firstChild.nodeValue == "true";
                } else if (curr.nodeName == "comparator") {
                    comparator = this._dom2Comparator(curr);
                } else if (curr.nodeName == "file-filter") {
                    fileFilter = this._dom2FileFilter(curr);
                }
            }
        }

        if (name == null || leftPath == null || rightPath == null) {
            return null;
        }
        var data = new VisualDifferSession(leftPath, rightPath);
        data.name = name;
        data.comparator = comparator;
        data.fileFilter = fileFilter;
        if (displayFilters) {
            data.displayFilters = displayFilters;
        }
        if (expandAll) {
            data.expandAll = expandAll;
        }

        return data;
    },

    _dom2Comparator : function(node) {
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
        data.useContent = useContent;

        return data;
    },

    _dom2FileFilter : function(node) {
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
    },

    promptSessionName : function(suggestedName, title, promptOverwrite) {
        var promptService = Components
                            .classes["@mozilla.org/embedcomp/prompt-service;1"]
                            .getService(Components.interfaces.nsIPromptService);
        var retVal = {value : suggestedName};
        var isOk = promptService.prompt(null, title,
                        VisualDifferCommon.getLocalizedMessage("session.name"),
                        retVal, null, {});
        var name = isOk ? retVal.value : null;

        if (name != null) {
            name = VisualDifferCommon.trim(name);
            if (name.length == 0) {
                promptService.alert(null, title,
                            VisualDifferCommon.getLocalizedMessage("session.invalid.name"));
                return null;
            }
            // do not prompt if suggestedName is equals to name
            if (name != suggestedName
                && promptOverwrite
                && this.findSessionIndexByName(name) >= 0) {
                var confirmMsg = VisualDifferCommon.getFormattedMessage(
                                        "session.confirm.overwrite", [name]);
                if (!promptService.confirm(null, title, confirmMsg)) {
                    return null;
                }
            }
        }

        return name;
    },

    /**
     * Rename a session prompting for name.
     * @param session the session to rename
     * @returns on success the new index position inside manager, -1 otherwise
     */
    renameSession : function(session) {
        if (session) {
            var newName = this.promptSessionName(session.name,
                        VisualDifferCommon.getLocalizedMessage("session.rename"));
            if (newName == null || session.name == newName) {
                return -1;
            }

            if (session.manager.findSessionIndexByName(newName) < 0) {
                session.name = newName;
                session.manager.sortSessions();
                return session.manager.findSessionIndexByName(newName);
            } else {
                var promptService = Components
                            .classes["@mozilla.org/embedcomp/prompt-service;1"]
                            .getService(Components.interfaces.nsIPromptService);
                promptService.alert(null,
                        VisualDifferCommon.getLocalizedMessage("session.rename"),
                        VisualDifferCommon.getLocalizedMessage("session.name.already.in.use"));
                return -1;
            }
        }
        return -1;
    },

    /**
     * Save the passed session prompting for its name
     * @param session the session to save
     * @returns on success the new index position inside manager, -1 otherwise
     */
    saveSession : function(session) {
        var newName = this.promptSessionName(session.name,
                    VisualDifferCommon.getLocalizedMessage("session.saveas"),
                    true);
        if (newName == null) {
            return -1;
        }

        var idx = this.findSessionIndexByName(newName);
        if (idx < 0) {
            session.name = newName;
            this.addSession(session);
            this.sortSessions();
            this.writeSessions();
        } else {
            if (newName == session.name) {
                // update session
                this.sessions[idx] = session;
                this.writeSessions();
            } else {
                // overwrite another session with the same name
                session.name = newName;
                this.sessions[idx] = session;
                this.sortSessions();
                this.writeSessions();
            }
        }
        // after sort can be changed
        return this.findSessionIndexByName(newName);
    }
}