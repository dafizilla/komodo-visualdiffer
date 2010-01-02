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
    /**
     * Copy selected file paths on both sides to clipboard.
     * Paths are copied in same order they appear on trees.
     * If same index path is selected on both sides the left has priority
     */
    this.onCopyPathsToClipboard = function(event) {
        var lSel = this.leftTreeView.selectedIndexes;
        var rSel = this.rightTreeView.selectedIndexes;
        var str = [];
        var l = 0;
        var r = 0;
        var pushPath = function(folderStatus) {
            if (folderStatus.file) {
                str.push(folderStatus.file.path);
            }
        }

        while (l < lSel.length || r < rSel.length) {
            if (l >= lSel.length) {
                pushPath(this.rightTreeView.getItemAt(rSel[r]));
                r++;
            } else if (r >= rSel.length) {
                pushPath(this.leftTreeView.getItemAt(lSel[l]));
                l++;
            } else {
                if (lSel[l] < rSel[r]) {
                    pushPath(this.leftTreeView.getItemAt(lSel[l]));
                    l++;
                } else if (lSel[l] > rSel[r]) {
                    pushPath(this.rightTreeView.getItemAt(rSel[r]));
                    r++;
                } else {
                    pushPath(this.leftTreeView.getItemAt(lSel[l]));
                    l++;
                    pushPath(this.rightTreeView.getItemAt(rSel[r]));
                    r++;
                }
            }
        }
        VisualDifferCommon.copyToClipboard(str.join("\n"));
    }
}).apply(gFolderDiffer);
