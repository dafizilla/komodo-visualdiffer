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

var gFolderTreeProperties = {};
gFolderTreeProperties["C"] = Components.classes["@mozilla.org/atom-service;1"]
            .getService(Components.interfaces.nsIAtomService)
            .getAtom("changedFile");

gFolderTreeProperties["A"] = Components.classes["@mozilla.org/atom-service;1"]
            .getService(Components.interfaces.nsIAtomService)
            .getAtom("addedFile");

gFolderTreeProperties["O"] = Components.classes["@mozilla.org/atom-service;1"]
            .getService(Components.interfaces.nsIAtomService)
            .getAtom("olderFile");

function FolderDifferTreeView(folderEntry, treeElement) {
    this._folderEntry = folderEntry;
    this._visibleFolder = [];
    
    for (var i = 0; i < this._folderEntry.length; i++) {
        this._folderEntry[i]._open = false;
        this._visibleFolder.push(this._folderEntry[i]);
    }
    
    this.treeElement = treeElement;

    this.treebox = null;
    // Must be set after treebox
    this.treeElement.view = this;
}

FolderDifferTreeView.prototype = {
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

    get currentSelectedIndex() {
        return this.selection.currentIndex;
    },

    get currentSelectedItem() {
        if (this.selection.currentIndex < 0) {
            return null;
        }
        return this._visibleFolder[this.selection.currentIndex];
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
        if (this.selection.currentIndex < 0) {
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
        this.selectAndEnsureVisible(lineNumber - 1);
        return true;
    },

    selectAndEnsureVisible : function(index) {
        this.selection.select(index);
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

    getCellText : function(row, column){
        if (this._visibleFolder[row].file) {
            switch (column.id || column) {
                case "filename":
                    return this._visibleFolder[row].file.leafName + " A = " + this._visibleFolder[row].addedFiles + "-- M = " + this._visibleFolder[row].modifiedFiles;
                case "filesize":
                    if (this._visibleFolder[row].file.isFile()) {
                        return this._visibleFolder[row].file.fileSize;
                    }
                    break;
                case "filetime":
                    const dateTimeContractID = "@mozilla.org/intl/scriptabledateformat;1";
                    const dateTimeIID = Components.interfaces.nsIScriptableDateFormat;
                    var dateTimeService = Components.classes[dateTimeContractID].getService(dateTimeIID);  
                    var dateStarted = new Date(this._visibleFolder[row].file.lastModifiedTime);
                    return dateTimeService.FormatDateTime("",
                                dateTimeService.dateFormatShort,
                                dateTimeService.timeFormatSeconds,
                                dateStarted.getFullYear(),
                                dateStarted.getMonth()+1,
                                dateStarted.getDate(),
                                dateStarted.getHours(),
                                dateStarted.getMinutes(),
                                dateStarted.getSeconds());
            }
        }

        return "";
    },

    get rowCount() {
        return this._visibleFolder.length;
    },

    getImageSrc: function (row, column) {
        switch (column.id || column) {
            case "filename":
                if (this.isContainer(row)) {
                    if (this.isContainerOpen(row)) {
                        return "chrome://visualdiffer/skin/folder-open.png";
                    } else {
                        return "chrome://visualdiffer/skin/folder.png";
                    }
                }
            break;
        }

        return null;
    },

    setTree: function(treebox) {
        this.treebox = treebox;
    },

    getCellProperties: function(row, column, props) {
        if (this._visibleFolder[row].isFileObject) {
            var prop = gFolderTreeProperties[this._visibleFolder[row].status];

            if (prop) {
                props.AppendElement(prop);
            }
        }
    },

    getLevel: function(row) {
        return this._visibleFolder[row].level;
    },
    
    hasNextSibling: function(idx, after) {
        var thisLevel = this.getLevel(idx);
        
        for (var t = idx + 1; t < this._visibleFolder[idx].length; t++) {
            var nextLevel = this.getLevel(t)
            if (nextLevel == thisLevel) return true;
            else if (nextLevel < thisLevel) return false;
        }
        return false;
    },
  
    getParentIndex: function(row) {
try {
        if (!this.isContainer(row)) {
            for (var i = row - 1; i >= 0 ; i--) {
                if (this.isContainer(i)) {
                    return i;
                }
            }
        }
} catch (err) {
    alert("getParentIndex " + err);
}
        return -1;
    },

    isContainer: function(row) {
        return this._visibleFolder[row].isFolderObject;
    },

    isContainerEmpty: function(row) {
        return this._visibleFolder[row].subfolders && this._visibleFolder[row].subfolders.length == 0;
    },
    
    isContainerOpen: function(row) {
        return this._visibleFolder[row]._open;
    },
    
    toggleOpenState: function(row) {
try {
        if (this.lockOperation) {
            return;
        }
        var item = this._visibleFolder[row];

        if (item.subfolders && !item.subfolders.length) return;
    
        this.lockOperation = true;
        this.otherView.toggleOpenState(row);
        this.lockOperation = false;
        if (item._open) {
            item._open = false;
    
            var thisLevel = this.getLevel(row);
            var deletecount = 0;
            for (var t = row + 1; t < this._visibleFolder.length; t++) {
                if (this.getLevel(t) > thisLevel) deletecount++;
                else break;
            }
            if (deletecount) {
                this._visibleFolder.splice(row + 1, deletecount);
                this.treebox.rowCountChanged(row + 1, -deletecount);
            }
        } else {
            item._open = true;
    
            var toinsert = item.subfolders;
            if (toinsert == null) {
                toinsert = this.otherView._visibleFolder[row].subfolders;
                for (var i = 0; i < toinsert.length; i++) {
                    this._visibleFolder.splice(row + i + 1, 0, new FolderStatus(null, null, toinsert[i].level));
                }
            } else {
                for (var i = 0; i < toinsert.length; i++) {
                    toinsert[i]._open = false;
                    this._visibleFolder.splice(row + i + 1, 0, toinsert[i]);
                }
            }
            this.treebox.rowCountChanged(row + 1, toinsert.length);
        }
        this.treebox.invalidateRow(row);
} catch (err) {
    alert("toggleOpenState " + err);
}
        
      },


    cycleCell: function(row, column) {},
    cycleHeader: function(col, elem) {},
    isSeparator: function(row){ return false; },
    isSorted: function(row){ return false; },
    getRowProperties: function(row,col,props){},
    getColumnProperties: function(colid,col,props){}
};

