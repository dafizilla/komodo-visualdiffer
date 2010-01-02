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
# Portions created by the Initial Developer are Copyright (C) 2010
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
    this.onCopy = function(event) {
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

    this.buildDestinationFiles = function(treeView, baseFolderFile, parents) {
        var arr = [];
        var destFile = baseFolderFile.clone();

        for (var i = 0; i < parents.length; i++) {
            var folderStatus = treeView.getItemAt(parents[i]);
            destFile.append(folderStatus.file.leafName);

            arr.push(destFile.clone())
        }
        return arr;
    },

    this.checkConfirmations = function(arrFiles, isLastDirectory) {
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
    this.updateFolderStatus = function(folderStatus, file, level, parent) {
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
    this.refreshTreeAfterFileOperation = function(fromTreeView,
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

    this.onShowInFileManager = function(event) {
        var arr = this.getTreeViewSortedById(
                    document.commandDispatcher.focusedElement.id);

        VisualDifferCommon.showFileInFileManager(arr[0].currentSelectedItem.file.path);
    }
}).apply(gFolderDiffer);
