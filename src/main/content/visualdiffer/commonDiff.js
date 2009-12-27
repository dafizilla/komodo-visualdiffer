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

const DISPLAY_FILTER_SHOW_ALL = 1;
const DISPLAY_FILTER_ONLY_MISMATCHES = 2;
const DISPLAY_FILTER_ONLY_MATCHES = 3;
const DISPLAY_FILTER_NO_ORPHAN = 4;
const DISPLAY_FILTER_MISMATCHES_BUT_NO_ORPHANS = 5;
const DISPLAY_FILTER_ONLY_ORPHANS = 6;
const DISPLAY_FILTER_ONLY_LEFT_SIDE_NEWER = 7;
const DISPLAY_FILTER_ONLY_RIGHT_SIDE_NEWER = 8;
const DISPLAY_FILTER_LEFT_NEWER_AND_LEFT_ORPHANS = 9;
const DISPLAY_FILTER_RIGHT_NEWER_AND_RIGHT_ORPHANS = 10;

/**
 * status : { A = Added, D = Deleted, S = Same, C = Changed, M = Missing }
 */
function VisualLineStatus(status, number, text) {
    this.status = status;
    this.number = number;
    this.text = text;
}

/*
 * FolderStatus contains info about a folder or file object relative to the
 * corresponding object on the other side.
 * The status value for folders is set with latest assigned value.
 * If it necessary to distinguish between 'A', 'C' and 'O' the corresponding
 * property (addedFiles, changedFiles, olderFiles) must be checked, too
 * @param file the nsIFile object, should be null if the corresponding FolderStatus
 * on the other side is orphan.
 * @param subfolders array containing FolderStatus elements
 * @param level the folder structure level
 * @param parent the parent FolderStatus (default null)
 * status : { A = Added, S = Same, C = Changed, O = Older }
 */
function FolderStatus(file, subfolders, level, parent) {
    this.file = file;
    this.subfolders = subfolders ? subfolders : [];
    this.level = level;
    this.status = "A";

    this.parent = typeof(parent) == "undefined" ? null : parent;

    this.olderFiles = 0;
    this.changedFiles = 0;
    this.addedFiles = 0;
    this.matchedFiles = 0;
    this.subfoldersSize = 0;

    this.isFileObject = file != null && file.isFile();
    this.isFolderObject = file != null && file.isDirectory();
}

FolderStatus.prototype = {
    toString : function() {
        return  this.subfoldersSize
                + "A" + this.addedFiles
                + " C" + this.changedFiles
                + " O" + this.olderFiles
                + " M" + this.matchedFiles
                + " S" + this.status
                + (this.file ? " " + this.file.leafName : "");
    }
}

var DiffCommon = {
    openFolderDifferFromSession : function(session) {
        window.openDialog("chrome://visualdiffer/content/folder/folderDiffer.xul",
                          "_blank",
                          "chrome,resizable=yes,dependent=no",
                          session);
    },

    /**
     * Open the file differ window
     * @param leftFilePath the path file to show on left side, can be null
     * @param rightFilePath the path file to show on right side, can be null
     */
    openFileDiffer : function(leftFilePath, rightFilePath) {
        window.openDialog("chrome://visualdiffer/content/file/fileDiffer.xul",
                          "_blank",
                          "chrome,resizable=yes,dependent=no",
                            leftFilePath,
                            rightFilePath);
    },

    /**
     * Align left and right FolderStatus using the specified comparator.
     * Both left and right arrays are filled with elements representing non-file
     * FolderStatus when necessary. If a folder is orphan on left/right side
     * its structure (with all subfolders) is added with non-file FolderStatus
     * on the other side.
     * All FolderStatus properties are updated (addedFiles, status, ...),
     * the parent properties are recomputed to reflect their descendant subfolders.
     * @param leftTree the left FolderStatus array
     * @param rightTree the right FolderStatus array
     * @param comparator the comparator to use to match elements
     */
    alignFolderStatus : function(leftTree, rightTree, comparator) {
        var l = 0;
        var r = 0;

        while ((l < leftTree.length) || (r < rightTree.length)) {
            var pos;

            if (l >= leftTree.length) {
                pos = 1;
            } else if (r >= rightTree.length) {
                pos = -1;
            } else if (leftTree[l].file && rightTree[r].file) {
                pos = this.compareFileTo(leftTree[l].file, rightTree[r].file);
            } else {
                if (!leftTree[l].file) {
                    l++;
                }
                if (!rightTree[r].file) {
                    r++;
                }
                continue;
            }
            if (pos == 0) {
                if (leftTree[l].isFileObject && rightTree[r].isFileObject) {
                    comparator.compare(leftTree[l], rightTree[r]);
                } else {
                    this.alignFolderStatus(leftTree[l].subfolders, rightTree[r].subfolders, comparator);
                }

                if (leftTree[l].parent) {
                    leftTree[l].parent.olderFiles += leftTree[l].olderFiles;
                    leftTree[l].parent.changedFiles += leftTree[l].changedFiles;
                    leftTree[l].parent.addedFiles += leftTree[l].addedFiles;
                    leftTree[l].parent.matchedFiles += leftTree[l].matchedFiles;
                    leftTree[l].parent.subfoldersSize += leftTree[l].file.fileSize
                            + leftTree[l].subfoldersSize;
                }
                if (rightTree[r].parent) {
                    rightTree[r].parent.olderFiles += rightTree[r].olderFiles;
                    rightTree[r].parent.changedFiles += rightTree[r].changedFiles;
                    rightTree[r].parent.addedFiles += rightTree[r].addedFiles;
                    rightTree[r].parent.matchedFiles += rightTree[r].matchedFiles;
                    rightTree[r].parent.subfoldersSize += rightTree[r].file.fileSize
                        + rightTree[r].subfoldersSize;
                }
                l++;
                r++;
            } else if (pos < 0) {
                ++leftTree[l].addedFiles;
                rightTree.splice(r, 0, new FolderStatus(null, null, leftTree[l].level, rightTree[r]));

                // align adding empty slots for files present only on left side
                this.alignFolderStatus(leftTree[l].subfolders, rightTree[r].subfolders, comparator);
                ++r;

                if (leftTree[l].parent) {
                    ++leftTree[l].parent.addedFiles;
                    leftTree[l].parent.subfoldersSize += leftTree[l].file.fileSize
                        + leftTree[l].subfoldersSize;
                }

                l++;
            } else {
                ++rightTree[r].addedFiles;
                leftTree.splice(l, 0, new FolderStatus(null,  null, rightTree[r].level, leftTree[l]));

                // align adding empty slots for files present only on right side
                this.alignFolderStatus(rightTree[r].subfolders, leftTree[l].subfolders, comparator);
                ++l;

                if (rightTree[r].parent) {
                    ++rightTree[r].parent.addedFiles;
                    rightTree[r].parent.subfoldersSize += rightTree[r].file.fileSize
                        + rightTree[r].subfoldersSize;
                }

                r++;
            }
        }
    },

    getDirectoryTree : function(fullPathDir, recursive, fileFilter) {
        var dir = Components.classes["@mozilla.org/file/local;1"]
               .createInstance(Components.interfaces.nsILocalFile);
        dir.initWithPath(fullPathDir);

        var tree = [];
        var root = new FolderStatus(dir, null, -1);
        tree.push(root);

        if (dir.isDirectory()) {
            root.subfolders = this.readDirectory(dir, recursive, 0, root, fileFilter);

            //this.traverseTree(tree, function(el) {el.subfolders.sort(DiffCommon.dirSorter); });
        }

        return tree;
    },

    /**
     * Must receive a directory
     */
    readDirectory : function(dir, recursive, level, parent, fileFilter) {
        var arr = [];

        var entries = dir.directoryEntries;

        while (entries.hasMoreElements()) {
            var entry = entries.getNext().QueryInterface(Components.interfaces.nsIFile);
            if (fileFilter == null || fileFilter.includes(entry)) {
                var folderStatus = new FolderStatus(entry, [], level, parent);

                if (recursive && entry.isDirectory()) {
                    folderStatus.subfolders = this.readDirectory(
                            entry, recursive, level + 1, folderStatus, fileFilter);
                }
                arr.push(folderStatus);
            }
        }
        arr.sort(DiffCommon.dirSorter);
        return arr;
    },

    traverseTree : function(tree, callback) {
        for (var i in tree) {
            var el = tree[i];
            callback(el);
            if (el && el.subfolders) {
                if (el.subfolders.length) {
                    this.traverseTree(el.subfolders, callback);
                }
            }
        }
    },

    compareFileTo : function(file1, file2) {
        if (file1.isDirectory() && file2.isDirectory()) {
            return VisualDifferCommon.compareTo(file1.leafName.toLowerCase(),
                                  file2.leafName.toLowerCase());
        }
        if (file1.isFile() && file2.isFile()) {
            var fn1 = VisualDifferCommon.fnSplit(file1.leafName.toLowerCase());
            var fn2 = VisualDifferCommon.fnSplit(file2.leafName.toLowerCase());
            var cmp = VisualDifferCommon.compareTo(fn1[0], fn2[0]);
            if (cmp == 0) {
                return VisualDifferCommon.compareTo(fn1[1], fn2[1]);
            }
            return cmp;
        }
        // Place directories before files
        if (file1.isDirectory()) {
            return -1;
        }
        return 1;
    },

    dirSorter : function(ea, eb) {
        return DiffCommon.compareFileTo(ea.file, eb.file);
    },

    /**
     * Apply display filters to FolderStatus trees
     * @param leftTree array containing folderStatus elements
     * @param rightTree array containing folderStatus elements
     * @param displayFilters the display filter value
     * @returns object with properties {left, right}, the properties are arrays
     * containing folderStatus elements matching displayFilters
     */
    applyDisplayFilters : function(leftTree, rightTree, displayFilters) {
        var ret = { left : [], right : []};

        for (var i = 0; i < leftTree.length; i++) {
            var left = leftTree[i];
            var right = rightTree[i];

            if (DiffCommon.isDisplayable(left, right, displayFilters)) {
                if (left.isFolderObject || right.isFolderObject) {
                    var subs = DiffCommon.applyDisplayFilters(
                                            left.subfolders,
                                            right.subfolders,
                                            displayFilters);
                    left.subfolders = subs.left;
                    right.subfolders = subs.right;
                }
                ret.left.push(left);
                ret.right.push(right);
            }
        }
        return ret;
    },

    /**
     * Determine if left and right can be displayed based on displayFilters
     * @param left FolderStatus
     * @param right FolderStatus
     * @param displayFilters the display filter value
     * @returns true if displayable, false otherwise
     */
    isDisplayable : function(left, right, displayFilters) {
        if (left && right && displayFilters) {
            switch (displayFilters.filter) {
                case DISPLAY_FILTER_SHOW_ALL:
                    return true;
                case DISPLAY_FILTER_ONLY_MISMATCHES:
                    return !(left.status == "S" && right.status == "S");
                case DISPLAY_FILTER_ONLY_MATCHES:
                    return left.matchedFiles > 0;
                case DISPLAY_FILTER_NO_ORPHAN:
                    return left.addedFiles == 0 && right.addedFiles == 0;
                case DISPLAY_FILTER_ONLY_ORPHANS:
                    return left.addedFiles > 0 || right.addedFiles > 0;
            }
        }
        return true;
    }
}
