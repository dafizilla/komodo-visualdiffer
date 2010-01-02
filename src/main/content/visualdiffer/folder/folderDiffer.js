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
if (typeof (gFolderDiffer) == "undefined") {
    var gFolderDiffer = {};
}

(function () {
    this.onLoad = function() {
        try {
            this.initControls();
        } catch (err) {
            alert(err);
        }
        sizeToContent();
    },

    this.makeDiff = function(leftPath, rightPath, saveMRU) {
        try {
            var leftFolder = VisualDifferCommon.makeLocalFile(leftPath);
            var rightFolder = VisualDifferCommon.makeLocalFile(rightPath);

            if (leftFolder.isDirectory() && rightFolder.isDirectory()) {
                window.setCursor("wait");

                var fileFilter = this.useFileFilter ? this.session.fileFilter : null;
                var leftTree = DiffCommon.getDirectoryTree(leftPath, true, fileFilter);
                var rightTree = DiffCommon.getDirectoryTree(rightPath, true, fileFilter);
                // Ensure comparator is ready to compare
                this.session.comparator.prepare();

                // get subfolders because the base folders (eg xxxTree[0]) can be different
                DiffCommon.alignFolderStatus(leftTree[0].subfolders,
                                           rightTree[0].subfolders,
                                           this.session.comparator);

                var displayFiltered = DiffCommon.applyDisplayFilters(
                                        leftTree[0].subfolders,
                                        rightTree[0].subfolders,
                                        this.session.displayFilters)
                leftTree[0].subfolders = displayFiltered.left;
                rightTree[0].subfolders = displayFiltered.right;

                this.leftTreeView = new FolderDifferTreeView(leftTree[0],
                            document.getElementById("left-tree"));
                this.rightTreeView = new FolderDifferTreeView(rightTree[0],
                            document.getElementById("right-tree"));

                this.leftTreeView.otherView = this.rightTreeView;
                this.rightTreeView.otherView = this.leftTreeView;

                this.safeSelectIndex(this.leftTreeView, 0);

                if (this.session.expandAll) {
                    this.onExpandAllFolders();
                } else {
                    this.onCollapseAllFolders();
                }
                this.leftTreeView.refresh();

                this.updateInputBoxes(leftPath, rightPath, saveMRU);
                document.title = this.bundle.getFormattedString(
                        "file.compare.title", [leftFolder.leafName, rightFolder.leafName]);
                window.setCursor("auto");
            }
        } catch (err) {
            window.setCursor("auto");
            alert(err);
            VisualDifferCommon.logException(err, "makeDiff");
        }
    },

    this.updateInputBoxes = function(leftPath, rightPath, saveMRU) {
        this.leftFolderTextBox.value = leftPath;
        this.rightFolderTextBox.value = rightPath;

        if (saveMRU) {
            this.leftFolderTextBox.addToMRU();
            this.rightFolderTextBox.addToMRU();
        }
    },

    this.initControls = function() {
        this.panelLayout = document.getElementById("panel-layout");
        this.panelSplitter = document.getElementById("panel-splitter");
        this.leftFolderTextBox = document.getElementById("left-folder-textbox");
        this.rightFolderTextBox = document.getElementById("right-folder-textbox");
        this.sessionMenuList = document.getElementById("session-menulist");
        this.sessionMenuPopup = document.getElementById("session-menupopup");

        document.getElementById("left-tree").addEventListener("DOMAttrModified",
                        function(event) { gFolderDiffer.onScroll(event);}, false);
        document.getElementById("right-tree").addEventListener("DOMAttrModified",
                        function(event) { gFolderDiffer.onScroll(event);}, false);
        this.bundle = document.getElementById("strings");
        this.initValues();
    },

    this.initValues = function() {
        if (window.arguments.length == 2) {
            alert("DBG: Must set manager!!");
            this.session = new VisualDifferSession(window.arguments[0], window.arguments[1]);
        } else {
            this.session = window.arguments[0].clone();
        }
        this.fillSessionMenu(this.session.manager, this.sessionMenuList, false);
        document.getElementById("displayfilter-menulist").value = this.session.displayFilters;

        // used by onSelect event handler
        this.domKeyData = new VisualDifferCommon.DOMKeyData();

        this.useFileFilter = true;
        // To be sure to give user feedback with wait cursor makeDiff
        // is called only after window is visibile
        window.setTimeout(function() {
            gFolderDiffer.diffAfterWindowIsVisible(); }, 100);
    },

    this.diffAfterWindowIsVisible = function() {
        this.makeDiff(this.session.leftPath, this.session.rightPath, true);
        this.leftTreeView.treeElement.focus();
    },

    this.onScroll = function(event) {
        if (event.attrName == "curpos") {
            var arr = this.getTreeViewSortedById(event.target.id);

            if (arr[0] && arr[1] && arr[0].treebox && arr[1].treebox) {
                arr[1].treebox.scrollToRow(arr[0].treebox.getFirstVisibleRow());
            }
        }
    },

    this.onSelect = function(event) {
        if (this.selectionInProgress) {
            return;
        }

        var arr = this.getTreeViewSortedById(event.target.id);
        // do not sync current index if ctrl/meta key is down
        if (!this.domKeyData.ctrlKey && !this.domKeyData.metaKey) {
            arr[1].selection.currentIndex = arr[0].selection.currentIndex;
            this.safeSelectIndex(arr[1], -1);
        }
        this.domKeyData.reset();
    },

    this.onDblClick = function(event) {
        // if click on null file and the other side is folder toggles its state
        var arr = this.getTreeViewSortedById(
                            document.commandDispatcher.focusedElement.id);
        if (arr[0].currentSelectedItem.file == null
            && arr[1].currentSelectedItem.isFolderObject) {
            arr[1].toggleOpenState(arr[1].currentSelectedIndex);
            return;
        }

        this.compareFiles();
    },

    this.compareFiles = function() {
        var leftItem = this.leftTreeView.currentSelectedItem;
        var rightItem = this.rightTreeView.currentSelectedItem;

        if (leftItem.isFolderObject || rightItem.isFolderObject) {
            return;
        }
        var leftFile = null;
        var rightFile = null;

        if (leftItem.isFileObject) {
            leftFile = leftItem.file.path;
        }
        if (rightItem.isFileObject) {
            rightFile = rightItem.file.path;
        }

        DiffCommon.openFileDiffer(leftFile, rightFile);
    },

    this.onWindowKeyPress = function(event) {
        this.domKeyData.fillByEvent(event);
    },

    this.onTreeKeyPress = function(event) {
        var targetId = document.commandDispatcher.focusedElement.id;

        if (event.ctrlKey || event.metaKey) {
            var key = String.fromCharCode(event.which).toLowerCase();
            if (key == 'a') {
                var view = event.target.view;
                var selection = view.selection;

                selection.rangedSelect(0, view.rowCount - 1, true);
            } else {
                // syncronize the current element
                // note that the current element may be different from the focused element
                // the keydown is handled before XUL moves the currentIndex so
                // we determine the direction based on pressed key and adjust the
                // currentIndex
                var offset = event.keyCode == KeyEvent.DOM_VK_UP ? -1 :
                    event.keyCode == KeyEvent.DOM_VK_DOWN ? 1 : 0;

                if (offset != 0) {
                    var targetId = document.commandDispatcher.focusedElement.id;
                    var arr = this.getTreeViewSortedById(targetId);
                    arr[1].selection.currentIndex = arr[0].selection.currentIndex + offset;
                }
            }
        } else {
            if (event.keyCode == KeyEvent.DOM_VK_RETURN) {
                this.onDblClick(event);
            } else if (event.keyCode == KeyEvent.DOM_VK_BACK_SPACE) {
                //this.onBrowseUp(event);
            } else if (event.keyCode == KeyEvent.DOM_VK_LEFT) {
                if (targetId == "right-tree") {
                    this.leftTreeView.treeElement.focus();
                }
            } else if (event.keyCode == KeyEvent.DOM_VK_RIGHT) {
                if (targetId == "left-tree") {
                    this.rightTreeView.treeElement.focus();
                }
            }
        }
    },

    this.onTextEntered = function(textbox, isLeftTextBox) {
        if (VisualDifferCommon.folderExists(textbox.value)) {
            var leftPath;
            var rightPath;

            if (isLeftTextBox) {
                leftPath = textbox.value;
                rightPath = this.rightTreeView.baseFolder.file.path;
            } else {
                leftPath = this.leftTreeView.baseFolder.file.path;
                rightPath = textbox.value;
            }
            this.makeDiff(leftPath, rightPath, true);
        }
    },

    this.onSideBySide = function(toolbarButton) {
        var orient = toolbarButton.checked ? "horizontal" : "vertical";

        this.panelLayout.setAttribute("orient", orient);
        this.panelSplitter.setAttribute("orient", orient);
    },

     /**
     * Select tree index only if no selection event is pending
     * @param treeView the tree view where to set selection
     * @param index the index to select, if less that zero the selection is cleared
     */
    this.safeSelectIndex = function(treeView, index) {
        if (!this.selectionInProgress) {
            this.selectionInProgress = true;
            if (index < 0) {
                treeView.selection.clearSelection();
            } else {
                treeView.selection.select(index);
            }
            this.selectionInProgress = false;
        }
    },

   /**
     * Returns treeViews array where first element matches passed id.
     * The first element is the 'from' and the second the 'to'
     */
    this.getTreeViewSortedById = function(id) {
        var arr = [];

        if (id == "left-tree") {
            arr[0] = this.leftTreeView;
            arr[1] = this.rightTreeView;
        } else if (id == "right-tree") {
            arr[0] = this.rightTreeView;
            arr[1] = this.leftTreeView;
        } else {
            VisualDifferCommon.log("getViewSortedById : Invalid id '" + id + "'");
        }
        return arr;
    },

    this.onExpandAllFolders = function() {
        this.leftTreeView.expandAllFolders();
        this.rightTreeView.expandAllFolders();
        this.session.expandAll = true;
    },

    this.onCollapseAllFolders = function() {
        this.leftTreeView.collapseAllFolders();
        this.rightTreeView.collapseAllFolders();
        this.session.expandAll = false;
    }
}).apply(gFolderDiffer);
