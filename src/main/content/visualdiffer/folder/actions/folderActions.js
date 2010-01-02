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
    this.onFolderChanged = function(filePath, isLeftTextBox) {
        if (isLeftTextBox) {
            this.makeDiff(filePath.path, this.rightTreeView.baseFolder.file.path, true);
        } else {
            this.makeDiff(this.leftTreeView.baseFolder.file.path, filePath.path, true);
        }
    },

    this.onSetBaseFolder = function(event) {
        var targetId = document.commandDispatcher.focusedElement.id;
        if (targetId == "left-tree") {
            this.makeDiff(this.leftTreeView.currentSelectedItem.file.path,
                          this.rightTreeView.baseFolder.file.path,
                          false);
        } else {
            this.makeDiff(this.leftTreeView.baseFolder.file.path,
                          this.rightTreeView.currentSelectedItem.file.path,
                          false);
        }
    },

    this.onSetBaseFolderBothSide = function(event) {
        var arr = this.getTreeViewSortedById(
                    document.commandDispatcher.focusedElement.id);
        var selIndex = arr[0].selectedIndexes;

        if (selIndex.length == 2) {
            this.makeDiff(arr[0].getItemAt(selIndex[0]).file.path,
                          arr[0].getItemAt(selIndex[1]).file.path,
                          false);
        } else {
            this.makeDiff(this.leftTreeView.currentSelectedItem.file.path,
                          this.rightTreeView.currentSelectedItem.file.path,
                          false);
        }
    },

    this.onSetBaseFolderOnOtherSide = function(event) {
        var targetId = document.commandDispatcher.focusedElement.id;
        if (targetId == "left-tree") {
            this.makeDiff(this.leftTreeView.baseFolder.file.path,
                          this.leftTreeView.currentSelectedItem.file.path,
                          false);
        } else {
            this.makeDiff(this.rightTreeView.currentSelectedItem.file.path,
                          this.rightTreeView.baseFolder.file.path,
                          false);
        }
    }
}).apply(gFolderDiffer);
