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

    makeDiff : function(leftPath, rightPath, saveMRU) {
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

    updateInputBoxes : function(leftPath, rightPath, saveMRU) {
        this.leftFolderTextBox.value = leftPath;
        this.rightFolderTextBox.value = rightPath;

        if (saveMRU) {
            this.leftFolderTextBox.addToMRU();
            this.rightFolderTextBox.addToMRU();
        }
    },

    initControls : function() {
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

    initValues : function() {
        if (window.arguments.length == 2) {
            alert("DBG: Must set manager!!");
            this.session = new VisualDifferSession(window.arguments[0], window.arguments[1]);
        } else {
            this.session = window.arguments[0].clone();
        }
        this.fillSessionMenu(false);
        document.getElementById("displayfilter-menulist").value = this.session.displayFilters;

        // used by onSelect event handler
        this.domKeyData = new VisualDifferCommon.DOMKeyData();

        this.useFileFilter = true;
        // To be sure to give user feedback with wait cursor makeDiff
        // is called only after window is visibile
        window.setTimeout(function() {
            gFolderDiffer.diffAfterWindowIsVisible(); }, 100);
    },

    diffAfterWindowIsVisible : function() {
        this.makeDiff(this.session.leftPath, this.session.rightPath, true);
        this.leftTreeView.treeElement.focus();
    },

    fillSessionMenu : function(removeAllItems) {
        if (removeAllItems) {
            this.sessionMenuList.removeAllItems();
        }

        var sessions = this.session.manager.sessions;
        for (var i = 0; i < sessions.length; i++) {
            this.sessionMenuList.appendItem(sessions[i].name);
        }
        this.sessionMenuList.selectedIndex = this.session.manager.selectedIndex;
    },

    onScroll : function(event) {
        if (event.attrName == "curpos") {
            var arr = this.getTreeViewSortedById(event.target.id);

            if (arr[0] && arr[1] && arr[0].treebox && arr[1].treebox) {
                arr[1].treebox.scrollToRow(arr[0].treebox.getFirstVisibleRow());
            }
        }
    },

    onSelect : function(event) {
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

    onDblClick : function(event) {
        // if click on null file and the other side is folder toggles its state
        var arr = this.getTreeViewSortedById(
                            document.commandDispatcher.focusedElement.id);
        if (arr[0].currentSelectedItem.file == null
            && arr[1].currentSelectedItem.isFolderObject) {
            arr[1].toggleOpenState(arr[1].currentSelectedIndex);
            return;
        }

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

    onWindowKeyPress : function(event) {
        this.domKeyData.fillByEvent(event);
    },
    
    onTreeKeyPress : function(event) {
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

    onTextEntered : function(textbox, isLeftTextBox) {
        if (this._folderExists(textbox.value)) {
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

    onFolderChanged : function(filePath, isLeftTextBox) {
        if (isLeftTextBox) {
            this.makeDiff(filePath.path, this.rightTreeView.baseFolder.file.path, true);
        } else {
            this.makeDiff(this.leftTreeView.baseFolder.file.path, filePath.path, true);
        }
    },

    onSideBySide : function(toolbarButton) {
        var orient = toolbarButton.checked ? "horizontal" : "vertical";

        this.panelLayout.setAttribute("orient", orient);
        this.panelSplitter.setAttribute("orient", orient);
    },

     /**
     * Select tree index only if no selection event is pending
     * @param treeView the tree view where to set selection
     * @param index the index to select, if less that zero the selection is cleared
     */
    safeSelectIndex : function(treeView, index) {
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
    getTreeViewSortedById : function(id) {
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

    _folderExists : function(path) {
        try {
            var file = VisualDifferCommon.makeLocalFile(path);
            return file.exists() && file.isDirectory();
        } catch (err) {
            return false;
        }
    },

    onPopupShowing : function(event) {
        var arr = this.getTreeViewSortedById(
                    document.commandDispatcher.focusedElement.id);
        var menuitems = document.getElementById("tree-popup").childNodes;

        var indexes = arr[0].selectedIndexes;
        var hasMultipleSelection = indexes.length > 1;

        // Determine if all selected items aren't files
        var noneCount = 0;
        var folderCount = 0;
        for (var i = 0; i < indexes.length; i++) {
            var item = arr[0].getItemAt(indexes[i]);
            if (!item.file) {
                ++noneCount;
            } else if (item.isFolderObject) {
                ++folderCount;
            }
        }
        var fileType;
        if (noneCount == indexes.length) {
            fileType = "none";
        } else if (folderCount == indexes.length) {
            fileType = "folder";
        } else {
            fileType = "file";
        }

        for (var i = 0; i < menuitems.length; i++) {
            if (menuitems[i].localName == "menuitem") {
                this.processMenuItem(menuitems[i], fileType, hasMultipleSelection);
            }
        }
        // TODO: disable copy when under an empty folderstatus
    },

    processMenuItem : function(menuitem, fileType, hasMultipleSelection) {
        var enableforobject = menuitem.attributes.getNamedItem("visualdifferenableforobject");

        if (enableforobject) {
            if (this.isFileTypeSupported(enableforobject.value, fileType, hasMultipleSelection)) {
                menuitem.removeAttribute("disabled");
            } else {
                menuitem.setAttribute("disabled", "true");
            }
        }

        var showforobject = menuitem.attributes.getNamedItem("visualdiffershowforobject");

        if (showforobject) {
            if (this.isFileTypeSupported(showforobject.value, fileType, hasMultipleSelection)) {
                menuitem.removeAttribute("hidden");
            } else {
                menuitem.setAttribute("hidden", "true");
            }
        }
    },

    isFileTypeSupported : function(value, fileType, hasMultipleSelection) {
        var arr = value.split(":");
        var allowMultipleSelection = true;

        if (arr.length == 1) {
            allowMultipleSelection = true;
        } else {
            if (arr[1] == "singleSelection") {
                allowMultipleSelection = false;
            } else {
                allowMultipleSelection = true;
            }
        }

        switch(arr[0]) {
            case "both":
                if (fileType == "none") {
                    return false;
                } else {
                    return allowMultipleSelection ? true : !hasMultipleSelection;
                }
                break;
            case "folder":
            case "file":
                if (fileType != arr[0]) {
                    return false;
                } else {
                    return allowMultipleSelection ? true : !hasMultipleSelection;
                }
                break;
        }
        return false;
    },

    onSetBaseFolder : function(event) {
        var targetId = document.commandDispatcher.focusedElement.id;
        if (targetId == "left-tree") {
            this.makeDiff(this.leftTreeView.currentSelectedItem.file.path,
                          this.rightTreeView.baseFolder.file.path,
                          false)
        } else {
            this.makeDiff(this.leftTreeView.baseFolder.file.path,
                          this.rightTreeView.currentSelectedItem.file.path,
                          false)
        }
    },

    onCopy : function(event) {
        try {

        var targetId = document.commandDispatcher.focusedElement.id;
        var arr = this.getTreeViewSortedById(targetId);

        var fromFile = arr[0].currentSelectedItem.file;
        var isLastDirectory = fromFile.isDirectory();

        if (isLastDirectory) {
            alert("TBD - Copy directory not yet supported");
            return;
        }

        var parents = arr[0].getParentIndexes(arr[0].currentSelectedIndex).reverse();
        var arrFiles = this.buildDestinationFiles(arr[0],
                                                  arr[1].baseFolder.file,
                                                  parents);

        if (this.checkConfirmations(arrFiles, isLastDirectory)) {
            fromFile.copyTo(arrFiles[arrFiles.length - 1].parent, null);
            arrFiles[arrFiles.length - 1].lastModifiedTime = fromFile.lastModifiedTime;
            arr[0].currentSelectedItem.status = "S";
            this.refreshTreeAfterFileOperation(arr[0], arr[1],
                                               parents, arrFiles,
                                               this.session.comparator);
        }
        } catch (err) {
            alert(err);
        }
    },

    buildDestinationFiles : function(treeView, baseFolderFile, parents) {
        var arr = [];
        var destFile = baseFolderFile.clone();

        for (var i = 0; i < parents.length; i++) {
            var folderStatus = treeView.getItemAt(parents[i]);
            destFile.append(folderStatus.file.leafName);

            arr.push(destFile.clone())
        }
        return arr;
    },

    checkConfirmations : function(arrFiles, isLastDirectory) {
        var s = "";
        var confirmSettings = {
            confirmCreateFolder : true
        };
        for (var i = 0; i < arrFiles.length; i++) {
            s += arrFiles[i].path + "[" + arrFiles[i].exists() + "]";
            s += "\n";
        }
        //alert(s);
        return true;
    },

    /**
     * Update an existing FolderStatus
     * File is cloned
     */
    updateFolderStatus : function(folderStatus, file, level, parent) {
        if (!folderStatus.file) {
            folderStatus.file = file.clone();
            folderStatus.isFolderObject = file.isDirectory();
            folderStatus.isFileObject = file.isFile();
            folderStatus.level = level;
            folderStatus.status = "S";
            folderStatus.subfolders = [];
            folderStatus.parent = parent;

            return true;
        }

        return false;
    },

    /**
     * Align files positions and refresh trees after a file operation
     * @param fromTreeView the tree view from which file operation started
     * @param toTreeView the destination tree view
     * @param parents the parent indexes involved in refresh
     * @param arrFiles the new nsIFiles to link to toTreeView
     * @param comparator the difference comparator to use
     */
    refreshTreeAfterFileOperation : function(fromTreeView,
                                             toTreeView,
                                             parents,
                                             arrFiles,
                                             comparator) {
        var parent = toTreeView.baseFolder;
        var fromAlignStartFolder = null;
        var toAlignStartFolder = null;

        for (var i = 0; i < parents.length; i++) {
            var fromFolderStatus = fromTreeView.getItemAt(parents[i]);
            var toFolderStatus = toTreeView.getItemAt(parents[i]);

            parent.subfolders.push(toFolderStatus);
            var isUpdated = this.updateFolderStatus(toFolderStatus,
                                                    arrFiles[i],
                                                    fromFolderStatus.level,
                                                    parent);

            if (isUpdated) {
                if (!fromAlignStartFolder) {
                    fromAlignStartFolder = fromFolderStatus;
                    toAlignStartFolder = toFolderStatus;
                }
            }
            parent = toFolderStatus;
        }

        if (fromAlignStartFolder) {
            if (fromTreeView == this.rightTreeView) {
                var temp = fromAlignStartFolder;
                fromAlignStartFolder = toAlignStartFolder;
                toAlignStartFolder = temp;
            }
            DiffCommon.alignFolderStatus(fromAlignStartFolder.subfolders,
                                       toAlignStartFolder.subfolders,
                                       comparator,
                                       true);
        }
        this.leftTreeView.refresh();
        this.rightTreeView.refresh();
    },

    onOpenFilter : function(event) {
        var result = {isOk : false,
                      fileFilter : this.session.fileFilter};

        window.openDialog("chrome://visualdiffer/content/folder/filterDialog.xul",
                          "_blank",
                          "chrome,resizable=yes,dependent=yes,modal=yes",
                          result);
        if (result.isOk) {
            this.makeDiff(this.leftFolderTextBox.value, this.rightFolderTextBox.value, false);
        }
    },

    onDisableFilter : function(toolbarButton) {
        var attr;
        if (this.useFileFilter) {
            this.useFileFilter = false;
            attr = "tooltiptextenable";
        } else {
            this.useFileFilter = true;
            attr = "tooltiptextdisable";
        }
        toolbarButton.setAttribute("tooltiptext", toolbarButton.getAttribute(attr));
        this.makeDiff(this.leftFolderTextBox.value, this.rightFolderTextBox.value, false);
    },

    onOpenComparison : function(event) {
        var result = {isOk : false,
                      comparator : this.session.comparator};

        window.openDialog("chrome://visualdiffer/content/folder/comparisonDialog.xul",
                          "_blank",
                          "chrome,resizable=yes,dependent=yes,modal=yes",
                          result);
        if (result.isOk) {
            this.makeDiff(this.leftFolderTextBox.value, this.rightFolderTextBox.value, false);
        }
    },

    onCopyFileName : function(event) {
        var arr = this.getTreeViewSortedById(
                    document.commandDispatcher.focusedElement.id);
        var str = [];
        var indexes = arr[0].selectedIndexes;
        for(var i = 0; i < indexes.length; i++) {
            var item = arr[0].getItemAt(indexes[i]);
            if (item.file) {
                str.push(item.file.path);
            }
        }
        VisualDifferCommon.copyToClipboard(str.join("\n"));
    },

    onSaveSession : function(event) {
        var newName = ko.dialogs.prompt(null,
                    VisualDifferCommon.getLocalizedMessage("session.name"),
                    this.session.name,
                    VisualDifferCommon.getLocalizedMessage("session.saveas"));
        if (newName == null) {
            return;
        }

        if (VisualDifferCommon.trim(newName).length == 0) {
            alert(VisualDifferCommon.getLocalizedMessage("session.invalid.name"));
            return;
        }

        var idx = this.session.manager.findSessionIndexByName(newName);
        if (idx < 0) {
            var newSession = this.createSessionFromCurrent(newName);
            this.session.manager.addSession(newSession);
            this.session.manager.sortSessions();
            this.session.manager.writeSessions();
            this.session.manager.selectedIndex = this.session.manager
                    .findSessionIndexByName(newName);
            this.fillSessionMenu(true);
        } else {
            var confirmMsg = VisualDifferCommon
                .getFormattedMessage("session.confirm.overwrite", [newName])
            if (newName == this.session.name) {
                this.session.manager.sessions[idx] = this.createSessionFromCurrent(newName);
                this.session.manager.writeSessions();
            } else if (confirm(confirmMsg)) {
                this.session.manager.sessions[idx] = this.createSessionFromCurrent(newName);
                this.session.manager.sortSessions();
                this.session.manager.writeSessions();
                this.session.manager.selectedIndex = this.session.manager
                        .findSessionIndexByName(newName);
                this.fillSessionMenu(true);
            }
        }
    },

    createSessionFromCurrent : function(newName) {
        var newSession = this.session.clone();
        newSession.name = newName;
        newSession.leftPath = this.leftFolderTextBox.value;
        newSession.rightPath = this.rightFolderTextBox.value;

        return newSession;
    },

    onShowInFileManager : function(event) {
        var arr = this.getTreeViewSortedById(
                    document.commandDispatcher.focusedElement.id);

        VisualDifferCommon.showFileInFileManager(arr[0].currentSelectedItem.file.path);
    },

    onSessionMenuSelect : function() {
        this.session = this.session.manager.sessions[this.sessionMenuList.selectedIndex];
        document.getElementById("displayfilter-menulist").value = this.session.displayFilters;
        this.makeDiff(this.session.leftPath, this.session.rightPath, false);
    },

    onExpandAllFolders : function() {
        this.leftTreeView.expandAllFolders();
        this.rightTreeView.expandAllFolders();
        this.session.expandAll = true;
    },

    onCollapseAllFolders : function() {
        this.leftTreeView.collapseAllFolders();
        this.rightTreeView.collapseAllFolders();
        this.session.expandAll = false;
    },

    onChangeDisplayFolder : function(filterValue) {
        // parseInt() otherwise isDisplayable doesn't match value
        this.session.displayFilters = parseInt(filterValue);
        this.makeDiff(this.leftFolderTextBox.value, this.rightFolderTextBox.value, false);
    }
}
