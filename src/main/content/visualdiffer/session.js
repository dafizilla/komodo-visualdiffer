/*
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Initial Developer of the Original Code is
# Davide Ficano.
# Portions created by the Initial Developer are Copyright (C) 2008
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Davide Ficano <davide.ficano@gmail.com>
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****
*/
function VisualDifferSession(leftPath, rightPath) {
    this.name = "";
    this.leftPath = leftPath;
    this.rightPath = rightPath;
    this.comparator = new VisualDifferComparator();
    this.fileFilter = new VisualDifferFileFilter();
    this.displayFilters = {filter : DISPLAY_FILTER_SHOW_ALL};
    this.expandAll = false;
    this.manager = null;
}

VisualDifferSession.prototype = {
    toXml : function() {
        var xml = document.createElement("session");
        var node = document.createElement("session-name");
        node.appendChild(document.createTextNode(this.name));
        xml.appendChild(node);

        node = document.createElement("session-left-path");
        node.appendChild(document.createTextNode(this.leftPath));
        xml.appendChild(node);

        node = document.createElement("session-right-path");
        node.appendChild(document.createTextNode(this.rightPath));
        xml.appendChild(node);

        node = document.createElement("session-display-filter");
        node.appendChild(document.createTextNode(this.displayFilters.filter));
        xml.appendChild(node);

        node = document.createElement("session-expand-all");
        node.appendChild(document.createTextNode(this.expandAll));
        xml.appendChild(node);

        xml.appendChild(this.comparator.toXml());
        xml.appendChild(this.fileFilter.toXml());

        return xml;
    },

    clone : function() {
        var newSession = new VisualDifferSession();
        newSession.name = this.name;
        newSession.leftPath = this.leftPath;
        newSession.rightPath = this.rightPath;
        newSession.comparator = this.comparator.clone();
        newSession.fileFilter = this.fileFilter.clone();
        newSession.displayFilters.filter = this.displayFilters.filter;
        newSession.expandAll = this.expandAll;
        newSession.manager = this.manager;

        return newSession;
    }
}

function VisualDifferComparator() {
    this.useTimestamp = true;
    this.useSize = false;
    this.useContent = false;
}

VisualDifferComparator.prototype = {
    prepare : function() {
        this._arrFunctions = [];

        if (this.useTimestamp) {
            this._arrFunctions.push(this._compareTimestamp);
        }

        // size and content are mutual exclusive
        if (this.useSize) {
            this._arrFunctions.push(this._compareSize);
        } else if (this.useContent) {
            this._arrFunctions.push(this._compareContent);
        }
    },

    /**
     * Compare two FolderStatus and modify their state properties
     * (.status, .olderFiles, ...) based on comparison result.
     * All defined comparators are called but at first compare that doesn't match
     * return immediately
     * @param leftFolderStatus left
     * @param rightFolderStatus right
     * @returns 0 if comparison matches, < 0 if left is "less" than right,
     * > 0 if left is "greater" that right
     */
    compare : function(leftFolderStatus, rightFolderStatus) {
        for (var i in this._arrFunctions) {
            var result = this._arrFunctions[i](leftFolderStatus, rightFolderStatus);
            if (result != 0) {
                return result;
            }
        }
        return 0;
    },

    _compareTimestamp : function(leftFolderStatus, rightFolderStatus) {
        if (leftFolderStatus.file && rightFolderStatus.file) {
            var sign = leftFolderStatus.file.lastModifiedTime - rightFolderStatus.file.lastModifiedTime;
            if (sign < 0) {
                leftFolderStatus.status = "O";
                rightFolderStatus.status = "C";
                ++leftFolderStatus.olderFiles;
                ++rightFolderStatus.changedFiles;
            } else if (sign > 0) {
                leftFolderStatus.status = "C";
                rightFolderStatus.status = "O";
                ++leftFolderStatus.changedFiles;
                ++rightFolderStatus.olderFiles;
            } else {
                leftFolderStatus.status = "S";
                rightFolderStatus.status = "S";
                ++leftFolderStatus.matchedFiles;
                ++rightFolderStatus.matchedFiles;
            }
            return sign;
        }
        return 0;
    },

    _compareSize : function(leftFolderStatus, rightFolderStatus) {
        if (leftFolderStatus.file && rightFolderStatus.file) {
            var sign = leftFolderStatus.file.fileSize - rightFolderStatus.file.fileSize;
            if (sign < 0) {
                leftFolderStatus.status = "C";
                rightFolderStatus.status = "C";
                ++leftFolderStatus.changedFiles;
                ++rightFolderStatus.changedFiles;
            } else if (sign > 0) {
                leftFolderStatus.status = "C";
                rightFolderStatus.status = "C";
                ++leftFolderStatus.changedFiles;
                ++rightFolderStatus.changedFiles;
            } else {
                leftFolderStatus.status = "S";
                rightFolderStatus.status = "S";
                ++leftFolderStatus.matchedFiles;
                ++rightFolderStatus.matchedFiles;
            }
            return sign;
        }
        return 0;
    },

    _compareContent : function(leftFolderStatus, rightFolderStatus) {
        // not implemented yet
        return 0;
    },

    toXml : function() {
        var xml = document.createElement("comparator");

        var node = document.createElement("comparator-use-timestamp");
        node.appendChild(document.createTextNode(this.useTimestamp));
        xml.appendChild(node);

        node = document.createElement("comparator-use-size");
        node.appendChild(document.createTextNode(this.useSize));
        xml.appendChild(node);

        node = document.createElement("comparator-use-content");
        node.appendChild(document.createTextNode(this.useContent));
        xml.appendChild(node);
        return xml;
    },

    clone : function() {
        var newComparator = new VisualDifferComparator();
        newComparator.useTimestamp = this.useTimestamp;
        newComparator.useSize = this.useSize;
        newComparator.useContent = this.useContent;

        return newComparator;
    }
}

function VisualDifferFileFilter() {
    this._includeFilesArray = [];
    this._excludeFilesArray = [];
    this._includeFoldersArray = [];
    this._excludeFoldersArray = [];

    this._reIncludeFilesArray = [];
    this._reExcludeFilesArray = [];
    this._reIncludeFoldersArray = [];
    this._reExcludeFoldersArray = [];

    //this._isCaseInsensitiveSearch = false;
}

VisualDifferFileFilter.prototype = {
    get includeFilesArray() {
        return this._includeFilesArray;
    },

    set includeFilesArray(arr) {
        if (arr) {
            this._includeFilesArray = arr;
            this._reIncludeFilesArray = this._createREArray(this._includeFilesArray);
        } else {
            this._includeFilesArray = [];
            this._reIncludeFilesArray = [];
        }
    },

    get excludeFilesArray() {
        return this._excludeFilesArray;
    },

    set excludeFilesArray(arr) {
        if (arr) {
            this._excludeFilesArray = arr;
            this._reExcludeFilesArray = this._createREArray(this._excludeFilesArray);
        } else {
            this._excludeFilesArray = [];
            this._reExcludeFilesArray = [];
        }
    },

    get includeFoldersArray() {
        return this._includeFoldersArray;
    },

    set includeFoldersArray(arr) {
        if (arr) {
            this._includeFoldersArray = arr;
            this._reIncludeFoldersArray = this._createREArray(this._includeFoldersArray);
        } else {
            this._includeFoldersArray = [];
            this._reIncludeFoldersArray = [];
        }
    },

    get excludeFoldersArray() {
        return this._excludeFoldersArray;
    },

    set excludeFoldersArray(arr) {
        if (arr) {
            this._excludeFoldersArray = arr;
            this._reExcludeFoldersArray = this._createREArray(this._excludeFoldersArray);
        } else {
            this._excludeFoldersArray = [];
            this._reExcludeFoldersArray = [];
        }
    },

    _createREArray : function(arr) {
        var reArr = [];

        for (var i = 0; i < arr.length; i++) {
            reArr.push(new extensions.dafizilla.visualdiffer.stringUtils.PatternMatcher.strategies.globCase(arr[i],
                            false));
        }

        return reArr;
    },

    _checkIncludes : function(file) {
        var arr;
        if (file.isDirectory()) {
            arr = this._reIncludeFoldersArray;
        } else {
            arr = this._reIncludeFilesArray;
        }
        // If no filter is defined then includes all files/folders
        if (arr.length == 0) {
            return true;
        }
        return this._matches(arr, file.leafName);
    },

    _checkExcludes : function(file) {
        var arr;

        if (file.isDirectory()) {
            arr = this._reExcludeFoldersArray;
        } else {
            arr = this._reExcludeFilesArray;
        }
        return this._matches(arr, file.leafName);
    },

    _matches : function(arrRE, str) {
        for (var i = 0; i < arrRE.length; i++) {
            if (arrRE[i].matches(str)) {
                return true;
            }
        }
        return false;
    },

    includes : function(file) {
        return this._checkIncludes(file) && !this._checkExcludes(file);
    },

    toXml : function() {
        var xml = document.createElement("file-filter");

        var node = document.createElement("file-filter-include-files");
        node.appendChild(document.createTextNode(this._includeFilesArray.join("\n")));
        xml.appendChild(node);

        node = document.createElement("file-filter-include-folders");
        node.appendChild(document.createTextNode(this._includeFoldersArray.join("\n")));
        xml.appendChild(node);

        node = document.createElement("file-filter-exclude-files");
        node.appendChild(document.createTextNode(this._excludeFilesArray.join("\n")));
        xml.appendChild(node);

        node = document.createElement("file-filter-exclude-folders");
        node.appendChild(document.createTextNode(this._excludeFoldersArray.join("\n")));
        xml.appendChild(node);

        return xml;
    },

    clone : function() {
        var newFileFilter = new VisualDifferFileFilter();
        newFileFilter.includeFilesArray = this.includeFilesArray.slice(0);
        newFileFilter.includeFoldersArray = this.includeFoldersArray.slice(0);
        newFileFilter.excludeFilesArray = this.excludeFilesArray.slice(0);
        newFileFilter.excludeFoldersArray = this.excludeFoldersArray.slice(0);

        return newFileFilter;
    }
}