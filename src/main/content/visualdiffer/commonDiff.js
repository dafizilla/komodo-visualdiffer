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

/**
 * status : { A = Added, D = Deleted, S = Same, C = Changed, M = Missing }
 */
function VisualLineStatus(status, number, text) {
    this.status = status;
    this.number = number;
    this.text = text;
}

/*
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

    this.isFileObject = file && file.isFile();
    this.isFolderObject = file && file.isDirectory();
}

// Code partially inspired by Colored Diffs
// https://addons.mozilla.org/en-US/thunderbird/addon/4268

var DiffCommon = {
    getUnifiedDiffContent : function(leftFilePath, rightFilePath) {
        var unifiedDiff = Components.classes['@activestate.com/koDiff;1']
                      .createInstance(Components.interfaces.koIDiff);
        unifiedDiff.initByDiffingFiles(leftFilePath, rightFilePath);

        return unifiedDiff.diff;
    },

    openFolderDifferFromSession : function(session) {
        window.openDialog("chrome://visualdiffer/content/folder/folderDiffer.xul",
                          "_blank",
                          "chrome,resizable=yes,dependent=no",
                          session);
    },

    openFileDiffer : function(leftFilePath, rightFilePath) {
        window.openDialog("chrome://visualdiffer/content/file/fileDiffer.xul",
                          "_blank",
                          "chrome,resizable=yes,dependent=no",
                            leftFilePath,
                            rightFilePath);
    },

    createVisualDiffInfo : function (lines, oldFileContent, newFileContent) {
        var currLine = 0;
        var chunks = [];

        while (currLine < lines.length) {
            var line = lines[currLine];
            var regExpRes = line.match(/^@@\s+\-(\d+),(\d+)\s+\+(\d+),(\d+)\s+@@/);
            if (!regExpRes) {
                ++currLine;
                continue;
            }
            var oldChunkLine = Number(regExpRes[1]);
            var newChunkLine = Number(regExpRes[3]);

            var alignInfo = { lineStatus : [], oldLineCount : 0, newLineCount : 0};

            while (++currLine < lines.length) {
                line = lines[currLine];

                if (/^\-(.*)$/.test(line)) {
                    alignInfo.lineStatus[alignInfo.oldLineCount] = "C";
                    ++oldChunkLine;
                    ++alignInfo.oldLineCount;
                } else if (/^\+(.*)$/.test(line)) {
                    alignInfo.lineStatus[alignInfo.newLineCount] = "C";
                    ++newChunkLine;
                    ++alignInfo.newLineCount;
                } else if (/^ (.*)$/.test(line)) {
                    this._alignLines(alignInfo);
                    ++oldChunkLine;
                    ++alignInfo.oldLineCount;
                    ++newChunkLine;
                    ++alignInfo.newLineCount;
                    alignInfo.lineStatus.push("S");
                } else {
                    break;
                }
            }
            this._alignLines(alignInfo);

            chunks.push({
                        startOldChunkLine : Number(regExpRes[1]),
                        endOldChunkLine : Number(regExpRes[2]),
                        startNewChunkLine : Number(regExpRes[3]),
                        endNewChunkLine : Number(regExpRes[4]),
                        lineStatus : alignInfo.lineStatus});
        }

        var arr = this._prepareArraysLine(chunks, oldFileContent, newFileContent);
        return {
            oldVisualLineStatus : arr[0],
            newVisualLineStatus : arr[1],
            sections : arr[2],
            oldRealLines : oldFileContent,
            newRealLines : newFileContent,
            chunks : chunks
        };
    },

    _alignLines : function(alignInfo) {
        while (alignInfo.oldLineCount < alignInfo.newLineCount) {
            alignInfo.lineStatus[alignInfo.oldLineCount++] = "A";
        }
        while (alignInfo.oldLineCount > alignInfo.newLineCount) {
            alignInfo.lineStatus[alignInfo.newLineCount++] = "D";
        }
    },

    _prepareArraysLine : function (chunks, oldFileContent, newFileContent) {
        var oldLastWrittenLine = 1;
        var newLastWrittenLine = 1;
        var oldVisualLineStatus = [];
        var newVisualLineStatus = [];
        var sections = [];

        for (var i = 0; i < chunks.length; i++) {
            var lineStatus = chunks[i].lineStatus;

            // add all preceding same lines on old
            for (var ii = oldLastWrittenLine; ii < chunks[i].startOldChunkLine; ii++) {
                oldVisualLineStatus.push(new VisualLineStatus("S", ii, oldFileContent[ii - 1]));
            }

            // add all preceding same lines on new
            for (var ii = newLastWrittenLine; ii < chunks[i].startNewChunkLine; ii++) {
                newVisualLineStatus.push(new VisualLineStatus("S", ii, newFileContent[ii - 1]));
            }

            oldLastWrittenLine = chunks[i].startOldChunkLine - 1;
            newLastWrittenLine = chunks[i].startNewChunkLine - 1;
            var sectionFound = false;

            for (var j = 0; j < lineStatus.length; j++) {
                if (lineStatus[j] == "S" || lineStatus[j] == "C") {
                    oldVisualLineStatus.push(new VisualLineStatus(
                            lineStatus[j],
                            oldLastWrittenLine + 1,
                            oldFileContent[oldLastWrittenLine++]));
                    newVisualLineStatus.push(new VisualLineStatus(
                            lineStatus[j],
                            newLastWrittenLine + 1,
                            newFileContent[newLastWrittenLine++]));
                } else {
                    if (lineStatus[j] == "D") {
                        oldVisualLineStatus.push(new VisualLineStatus(
                            "D",
                            oldLastWrittenLine + 1,
                            oldFileContent[oldLastWrittenLine++]));
                        newVisualLineStatus.push(new VisualLineStatus("M", -1, ""));
                    } else if (lineStatus[j] == "A") {
                        oldVisualLineStatus.push(new VisualLineStatus("M", -1, ""));
                        newVisualLineStatus.push(new VisualLineStatus(
                            "A",
                            newLastWrittenLine + 1,
                            newFileContent[newLastWrittenLine++]));
                    }
                }
                if (lineStatus[j] == "S") {
                    sectionFound = false;
                } else {
                    if (sectionFound == false) {
                        sectionFound = true;
                        sections.push({start: oldVisualLineStatus.length,
                                      end: oldVisualLineStatus.length});
                    } else {
                        ++sections[sections.length - 1].end;
                    }
                }
            }
            oldLastWrittenLine = chunks[i].startOldChunkLine + chunks[i].endOldChunkLine;
            newLastWrittenLine = chunks[i].startNewChunkLine + chunks[i].endNewChunkLine;
        }

        if (chunks.length == 0) {
            oldLastWrittenLine = -1;
            newLastWrittenLine = -1;
            lineOffset = 1;
        } else {
            lineOffset = 0;
        }

        // add all following same lines on old
        for (var ii = oldLastWrittenLine + 1; ii < oldFileContent.length; ii++) {
            oldVisualLineStatus.push(new VisualLineStatus("S", lineOffset + ii, oldFileContent[ii]));
        }

        // add all following same lines on new
        for (var ii = newLastWrittenLine + 1; ii < newFileContent.length; ii++) {
            newVisualLineStatus.push(new VisualLineStatus("S", lineOffset + ii, newFileContent[ii]));
        }
        return [oldVisualLineStatus, newVisualLineStatus, sections];
    },

    alignFolderDiff : function(leftTree, rightTree, comparator) {
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
                    var diffResult = comparator.compare(leftTree[l], rightTree[r]);
                    if (diffResult < 0) {
                        leftTree[l].status = "O";
                        rightTree[r].status = "C";

                        ++leftTree[l].olderFiles;
                        ++rightTree[r].changedFiles;
                    } else if (diffResult > 0) {
                        leftTree[l].status = "C";
                        rightTree[r].status = "O";

                        ++leftTree[l].changedFiles;
                        ++rightTree[r].olderFiles;
                    } else {
                        leftTree[l].status = "S";
                        rightTree[r].status = "S";
                    }
                } else {
                    this.alignFolderDiff(leftTree[l].subfolders, rightTree[r].subfolders, comparator);
                }

                if (leftTree[l].parent) {
                    leftTree[l].parent.olderFiles += leftTree[l].olderFiles;
                    leftTree[l].parent.changedFiles += leftTree[l].changedFiles;
                    leftTree[l].parent.addedFiles += leftTree[l].addedFiles;
                }
                if (rightTree[r].parent) {
                    rightTree[r].parent.olderFiles += rightTree[r].olderFiles;
                    rightTree[r].parent.changedFiles += rightTree[r].changedFiles;
                    rightTree[r].parent.addedFiles += rightTree[r].addedFiles;
                }
                l++;
                r++;
            } else if (pos < 0) {
                rightTree.splice(r++, 0, new FolderStatus(null, null, leftTree[l].level));

                if (leftTree[l].parent) {
                    ++leftTree[l].parent.addedFiles;
                }

                l++;
            } else {
                leftTree.splice(l++, 0, new FolderStatus(null,  null, rightTree[r].level));

                if (rightTree[r].parent) {
                    ++rightTree[r].parent.addedFiles;
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
}
