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
# Portions created by the Initial Developer are Copyright (C) 2007
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

var gFileTreeProperties = {};
gFileTreeProperties["D"] = Components.classes["@mozilla.org/atom-service;1"]
            .getService(Components.interfaces.nsIAtomService)
            .getAtom("deletedLine");

gFileTreeProperties["C"] = Components.classes["@mozilla.org/atom-service;1"]
            .getService(Components.interfaces.nsIAtomService)
            .getAtom("changedLine");

gFileTreeProperties["M"] = Components.classes["@mozilla.org/atom-service;1"]
            .getService(Components.interfaces.nsIAtomService)
            .getAtom("missingLine");

gFileTreeProperties["A"] = Components.classes["@mozilla.org/atom-service;1"]
            .getService(Components.interfaces.nsIAtomService)
            .getAtom("addedLine");

function FileDifferTreeView(treeElement) {
    this.treeElement = treeElement;

    this.filePath = "";
    this.items = [];
    this.realLines = [];

    this.treebox = null;
    // Must be set after treebox
    this.treeElement.view = this;
}

FileDifferTreeView.prototype = {
    init : function(lines, realLines) {
        this.items = lines;
        this.realLines = realLines;

        this.treebox = null;
        // Must be set after treebox
        this.treeElement.view = this;
    },

    invalidate : function() {
        this.treebox.invalidate();
    },

    get selectedIndexes() {
        var selection = this.selection;
        var items = [];

        for (var i = 0; i < selection.getRangeCount(); i++) {
            var minIdx = {};
            var maxIdx = {};
            selection.getRangeAt(i, minIdx, maxIdx);
            for (var selIdx = minIdx.value; selIdx <= maxIdx.value; selIdx++) {
                items.push(selIdx);
            }
        }

        return items;
    },

    get selectedText() {
        if (this.selection.currentIndex < 0 || this.items.length == 0) {
            return "";
        }
        return this.items[this.selection.currentIndex].text;
    },

    gotoLine : function(lineNumber) {
        if (lineNumber > this.realLines.length) {
            return false;
        }
        if (lineNumber <= 0) {
            lineNumber = 1;
        }
        // find line number (slow and dirty)
        var index = 0;
        for (; index < this.items.length; index++) {
            if (this.items[index].number == lineNumber) {
                break;
            }
        }
        this.selectAndEnsureVisible(index);
        return true;
    },

    selectAndEnsureVisible : function(index) {
        this.selection.select(index);
        // try to center line on screen
        //this.treebox.scrollByLines(this.treebox.getPageLength() / 2);
        this.treebox.ensureRowIsVisible(index);
    },

    deleteItems : function(items) {
        if (items && items.length > 0) {
            for (var i = items.length - 1; i >= 0; i--) {
                this.items.splice(items[i], 1);
            }
            this.treebox.rowCountChanged(items[0], -items.length);
        }
    },

    deleteSelectedItem : function() {
        try {
            var selIdx = this.selection.currentIndex;

            if (selIdx < 0) {
                return;
            }
            var newItems = new Array();

            for (var i = 0; i < this.items.length; i++) {
                if (i != selIdx) {
                    newItems.push(this.items[i]);
                }
            }

            this.items = newItems;
            // -1 means remove (< 0)
            this.treebox.rowCountChanged(selIdx, -1);

            if (newItems.length > 0) {
                this.selection.select(this.rowCount == selIdx ? selIdx - 1 : selIdx);
            }
        } catch (err) {
            alert(err);
        }
    },

    removeAllItems : function() {
        this.selection.clearSelection();
    },

    refresh : function() {
        this.selection.clearSelection();
        this.selection.select(0);
        this.treebox.invalidate();
        this.treebox.ensureRowIsVisible(0);
    },

    getCellText : function(row, column) {
        switch (column.id || column) {
            case "number":
                if (this.items[row].number >= 1) {
                    return this.items[row].number;
                }
                break;
            case "line":
                return this.items[row].text;
        }

        return "";
    },

    get rowCount() {
        return this.items.length;
    },

    cycleCell: function(row, column) {},

    getImageSrc: function (row, column) {
        return null;
    },

    setTree: function(treebox) {
        this.treebox = treebox;
    },

    getCellProperties: function(row, column, props) {
        var prop = null;

        switch (column.id || column) {
            case "line":
                prop = gFileTreeProperties[this.items[row].status];
                break;
        }

        if (prop) {
            props.AppendElement(prop);
        }
    },

    cycleHeader: function(col, elem) {},
    isContainer: function(row){ return false; },
    isSeparator: function(row){ return false; },
    isSorted: function(row){ return false; },
    getLevel: function(row){ return 0; },
    getRowProperties: function(row,col,props){},
    getColumnProperties: function(colid,col,props){}
};

