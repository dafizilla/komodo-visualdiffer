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
# Portions created by the Initial Developer are Copyright (C) 2009
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
const SEL_TYPE_NONE = 0;
const SEL_TYPE_NULLFILE = 1 << 1;
const SEL_TYPE_FOLDER = 1 << 2;
const SEL_TYPE_FILE = 1 << 3;
const SEL_TYPE_BOTH = SEL_TYPE_FILE | SEL_TYPE_FOLDER;

if (typeof (gFolderDiffer) == "undefined") {
    var gFolderDiffer = {};
}

(function () {
    this.onPopupShowing = function(event) {
        var arr = this.getTreeViewSortedById(
                    document.commandDispatcher.focusedElement.id);
        var focusedSelInfo = this.getSelectionInfo(arr[0]);
        var otherSelInfo = this.getSelectionInfo(arr[1]);
        var menuitems = event.target.getElementsByTagName("menuitem");

        for (var i = 0; i < menuitems.length; i++) {
            var menuitem = menuitems[i];
            if (this.enableMenu(menuitem.id, focusedSelInfo, otherSelInfo)) {
                menuitem.removeAttribute("hidden");
            } else {
                menuitem.setAttribute("hidden", "true");
            }
        }
    },

    /**
     * get selection info for the passed view
     * @param treeView
     * @returns the object containing the properties described below
     * selType the flag combination of SEL_TYPE_XXX
     * nullFileCount the count of selected null files
     * folderCount the count of selected folders
     * fileCount the count of selected files
     * hasMultipleSelection is true if there are more that one element selected
     */
    this.getSelectionInfo = function(treeView) {
        var indexes = treeView.selectedIndexes;
        var hasMultipleSelection = indexes.length > 1;

        // Determine if all selected items aren't files
        var nullFileCount = 0;
        var folderCount = 0;
        var fileCount = 0;
        for (var i = 0; i < indexes.length; i++) {
            var item = treeView.getItemAt(indexes[i]);
            if (!item.file) {
                ++nullFileCount;
            } else if (item.isFolderObject) {
                ++folderCount;
            } else {
                ++fileCount;
            }
        }
        var selType = SEL_TYPE_NONE;
        if (nullFileCount) {
            selType |= SEL_TYPE_NULLFILE;
        }
        if (folderCount) {
            selType |= SEL_TYPE_FOLDER;
        }
        if (fileCount) {
            selType |= SEL_TYPE_FILE;
        }

        return {selType : selType,
                nullFileCount : nullFileCount,
                folderCount : folderCount,
                fileCount : fileCount,
                hasMultipleSelection : hasMultipleSelection
                };
    },

    this.enableMenu = function(id, focusedSelInfo, otherSelInfo) {
        switch (id) {
            case "ctx-menuitem-set-base-folder":
            case "ctx-menuitem-set-base-folder-other-side":
                return focusedSelInfo.selType == SEL_TYPE_FOLDER
                        && otherSelInfo.selType == SEL_TYPE_NONE
                        && focusedSelInfo.folderCount == 1;
            case "ctx-menuitem-set-base-folder-both-side":
                return focusedSelInfo.selType == SEL_TYPE_FOLDER
                        && (otherSelInfo.selType == SEL_TYPE_FOLDER
                            || otherSelInfo.selType == SEL_TYPE_NONE)
                        && (focusedSelInfo.folderCount + otherSelInfo.folderCount) == 2
                        && (focusedSelInfo.folderCount == 1 || focusedSelInfo.folderCount == 2);
            case "ctx-menuitem-copy-filename":
                return (focusedSelInfo.selType & SEL_TYPE_BOTH) != 0;
            case "ctx-menuitem-show-file-manager":
                return !focusedSelInfo.hasMultipleSelection
                        && (focusedSelInfo.selType & SEL_TYPE_BOTH) != 0;
        }
        return true;
    },

    this.fillSessionMenu = function(sessionManager, sessionMenuList, removeAllItems) {
        if (removeAllItems) {
            sessionMenuList.removeAllItems();
        }

        var sessions = sessionManager.sessions;
        for (var i = 0; i < sessions.length; i++) {
            sessionMenuList.appendItem(sessions[i].name);
        }
        sessionMenuList.selectedIndex = sessionManager.selectedIndex;
    }
}).apply(gFolderDiffer);