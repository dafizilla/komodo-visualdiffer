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

var gFolderDiffer = {
    onLoad : function() {
        try {
            this.initControls();
        } catch (err) {
            alert(err);
        }
        sizeToContent();
    },

    makeDiff : function(leftPath, rightPath) {
        var leftFolder = VisualDifferCommon.makeLocalFile(leftPath);
        var rightFolder = VisualDifferCommon.makeLocalFile(rightPath);
        
        if (leftFolder.isDirectory() && rightFolder.isDirectory()) {
            var leftTree = DiffCommon.getDirectoryTree(leftPath, true);
            var rightTree = DiffCommon.getDirectoryTree(rightPath, true);
            var comparator = new Comparator();
            comparator.useTimestamp = true;
            comparator.prepare();
            DiffCommon.alignFolderDiff(leftTree[0].subfolders, rightTree[0].subfolders, comparator);

            this.leftTreeView = new FolderDifferTreeView(leftTree[0].subfolders,
                        document.getElementById("left-tree"));
            this.rightTreeView = new FolderDifferTreeView(rightTree[0].subfolders,
                        document.getElementById("right-tree"));
            this.leftTreeView.otherView = this.rightTreeView;
            this.rightTreeView.otherView = this.leftTreeView;

            this.safeSelectIndex(this.leftTreeView, 0);
            this.leftTreeView.refresh();
            
            this.updateInputBoxes(leftPath, rightPath);
        }
    },
    
    updateInputBoxes : function(leftPath, rightPath) {
        this.leftFolderTextBox.value = leftPath;
        this.rightFolderTextBox.value = rightPath;

        opener.ko.mru.addFromACTextbox(this.leftFolderTextBox);
        opener.ko.mru.addFromACTextbox(this.rightFolderTextBox);
    },
    
    initControls : function() {
        this.panelLayout = document.getElementById("panel-layout");
        this.panelSplitter = document.getElementById("panel-splitter");
        this.leftFolderTextBox = document.getElementById("left-folder-textbox");
        this.rightFolderTextBox = document.getElementById("right-folder-textbox");

        document.getElementById("left-tree").addEventListener("DOMAttrModified",
                        function(event) { gFolderDiffer.onScroll(event);}, false);
        document.getElementById("right-tree").addEventListener("DOMAttrModified",
                        function(event) { gFolderDiffer.onScroll(event);}, false);

        this.initValues();
    },

    initValues : function() {
        this.makeDiff(window.arguments[0], window.arguments[1]);
    },

    onCancel : function() {
    },
    
    onScroll : function(event) {
        if (event.attrName == "curpos") {
            var arr = this.getTreeViewSortedById(event.target.id);

            if (arr[0] && arr[1]) {
                arr[1].treebox.scrollToRow(arr[0].treebox.getFirstVisibleRow());
            }
        }
    },
    
    onSelect : function(event) {
        if (this.selectionInProgress) {
            return;
        }
        var arr = this.getTreeViewSortedById(event.target.id);
        this.safeSelectIndex(arr[1], arr[0].selection.currentIndex);
    },
    
    onDblClick : function(event) {
        var leftItem = this.leftTreeView.currentSelectedItem;
        var rightItem = this.rightTreeView.currentSelectedItem;
        
        if (leftItem.isFileObject && rightItem.isFileObject) {
            DiffCommon.openFileDiffer(leftItem.file.path, rightItem.file.path);
        } else {
            //alert("TBD NO OP ON FOLDERS");
        }
    },
    
    onTreeKeyPress : function(event) {
        if (event.ctrlKey) {
            var key = String.fromCharCode(event.which).toLowerCase();
            if (key == 'a') {
                var view = event.target.view;
                var selection = view.selection;

                selection.rangedSelect(0, view.rowCount - 1, true);
            }
        }
    },

    onKeyPress : function(event) {
        if (event.keyCode == KeyEvent.DOM_VK_RETURN) {
            // do not close dialog
            return false;
        }
        return true;
    },

    onTextEntered : function(textbox, isOldTextBox) {
        alert("TBD");
        //if (this._fileExists(textbox.value)) {
        //    var oldFile;
        //    var newFile;
        //
        //    if (isOldTextBox) {
        //        oldFile = textbox.value;
        //        newFile = this.rightTreeView.filePath;
        //    } else {
        //        oldFile = this.leftTreeView.filePath;
        //        newFile = textbox.value;
        //    }
        //    alert("TBD");
        //}
    },
    
    onBrowseFile : function(event, targetId) {
        var arr = this.getTreeViewSortedById(targetId);
        var file = Components.classes["@activestate.com/koFileService;1"]
                    .getService(Components.interfaces.koIFileService)
                    .getFileFromURI(arr[0].filePath);
        var filePath = opener.ko.filepicker.openFile(file.dirName);
        if (filePath) {
            if (arr[0] == this.leftTreeView) {
                alert("TBD");
            } else {
                alert("TBD");
            }
        }
    },
    onSideBySide : function(toolbarButton) {
        var orient = toolbarButton.checked ? "horizontal" : "vertical";

        this.panelLayout.setAttribute("orient", orient);
        this.panelSplitter.setAttribute("orient", orient);
    },
    
     /**
     * Select tree index only if no selection event is pending
     */
    safeSelectIndex : function(treeView, index) {
        if (!this.selectionInProgress) {
            this.selectionInProgress = true;
            treeView.selection.select(index);
            this.selectionInProgress = false;
        }
    },

   /**
     * Returns treeViews array where first element matches passed id.
     * The first element is the 'from' and the second the 'to'
     */
    getTreeViewSortedById : function(id) {
        var arr = [];
        
        if (id == "left-tree") {
            arr[0] = this.leftTreeView;
            arr[1] = this.rightTreeView;
        } else if (id == "right-tree") {
            arr[0] = this.rightTreeView;
            arr[1] = this.leftTreeView;
        } else {
            opener.ko.logging.getLogger("ko.main")
                .warn("getViewSortedById : Invalid id '" + id + "'");
        }
        return arr;
    }
}