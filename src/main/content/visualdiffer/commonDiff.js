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

function FolderStatus(file, subfolders, level, parent) {
    this.file = file;
    this.subfolders = subfolders;
    this.level = level;
    this.status = "A";

    this.parent = typeof(parent) == "undefined" ? null : parent;
    this.modifiedFiles = 0;
    this.addedFiles = 0;

    this.isFileObject = file && file.isFile();
    this.isFolderObject = file && file.isDirectory();
}

// Code partially inspired by Colored Diffs
// https://addons.mozilla.org/en-US/thunderbird/addon/4268

var DiffCommon = {
    openFolderDiffer : function(leftFilePath, rightFilePath) {
        window.openDialog("chrome://visualdiffer/content/folderDiffer.xul",
                          "_blank",
                          "chrome,resizable=yes,dependent=yes",
                            leftFilePath,
                            rightFilePath);
    },
    
    openFileDiffer : function(leftFilePath, rightFilePath) {
        window.openDialog("chrome://visualdiffer/content/fileDiffer.xul",
                          "_blank",
                          "chrome,resizable=yes,dependent=yes",
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
        
        // add all following same lines on old
        for (var ii = oldLastWrittenLine + 1; ii < oldFileContent.length; ii++) {
            oldVisualLineStatus.push(new VisualLineStatus("S", ii, oldFileContent[ii]));
        }
    
        // add all following same lines on new
        for (var ii = newLastWrittenLine + 1; ii < newFileContent.length; ii++) {
            newVisualLineStatus.push(new VisualLineStatus("S", ii, newFileContent[ii]));
        }
        return [oldVisualLineStatus, newVisualLineStatus, sections];
    },

 // status : { A = Added, D = Deleted, S = Same, C = Changed, M = Missing, O = Older }
    
    alignFolderDiff : function(leftTree, rightTree, comparator) {
        var l = 0;
        var r = 0;

        while ((l < leftTree.length) || (r < rightTree.length)) {
            var pos = l >= leftTree.length ? 1 : r >= rightTree.length ? -1
                : this.compareTo(leftTree[l].file.leafName, rightTree[r].file.leafName);

            if (pos == 0) {
                if (leftTree[l].isFileObject && rightTree[r].isFileObject) {
                    var diffResult = comparator.compare(leftTree[l], rightTree[r]);
                    if (diffResult < 0) {
                        leftTree[l].status = "O";
                        rightTree[r].status = "C";
                        
                        ++rightTree[r].modifiedFiles;
                    } else if (diffResult > 0) {
                        leftTree[l].status = "C";
                        rightTree[r].status = "O";

                        ++leftTree[l].modifiedFiles;
                    } else {
                        leftTree[l].status = "S";
                        rightTree[r].status = "S";
                    }
                } else {
                    this.alignFolderDiff(leftTree[l].subfolders, rightTree[r].subfolders, comparator);
                }

                if (leftTree[l].parent) {
                    leftTree[l].parent.addedFiles += leftTree[l].addedFiles;
                    leftTree[l].parent.modifiedFiles += leftTree[l].modifiedFiles;
                }
                if (rightTree[r].parent) {
                    rightTree[r].parent.addedFiles += rightTree[r].addedFiles;
                    rightTree[r].parent.modifiedFiles += rightTree[r].modifiedFiles;
                }
                l++;
                r++;
            } else if (pos < 0) {
                rightTree.splice(r++, 0, new FolderStatus(null, null, leftTree[l].level));

                ++leftTree[l].addedFiles;
                if (leftTree[l].parent) {
                    ++leftTree[l].parent.addedFiles;
                }

                l++;
            } else {
                leftTree.splice(l++, 0, new FolderStatus(null,  null, rightTree[r].level));

                ++rightTree[r].addedFiles;
                if (rightTree[r].parent) {
                    ++rightTree[r].parent.addedFiles;
                }

                r++;
            }
        }
    },
    
    compareTo : function(str1, str2) {
        return str1 == str2 ? 0 : str1 < str2 ? -1 : 1;
    },

    getDirectoryTree : function(fullPathDir, recursive) {
        var dir = Components.classes["@mozilla.org/file/local;1"]
               .createInstance(Components.interfaces.nsILocalFile);
        dir.initWithPath(fullPathDir);
        
        var root = new FolderStatus(dir, null, -1);
        root.subfolders = this.readDirectory(dir, recursive, 0, root);
        var tree = [root];
    
        this.traverseTree(tree, function(el) {el.subfolders.sort(DiffCommon.dirSorter); });
        
        return tree;
    },

    readDirectory : function(dir, recursive, level, parent) {
        var arr = [];
        
        if (dir.isDirectory()) {
            var entries = dir.directoryEntries;
    
            while (entries.hasMoreElements()) {
                var entry = entries.getNext().QueryInterface(Components.interfaces.nsIFile);
                var folderStatus = new FolderStatus(entry, [], level, parent);

                if (recursive && entry.isDirectory()) {
                    folderStatus.subfolders = this.readDirectory(
                            entry, recursive, level + 1, folderStatus);
                }
                arr.push(folderStatus);
            }
        }
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

    dirSorter : function(ea, eb) {
        var afile = ea.file;
        var bfile = eb.file;
    
        if (afile.isDirectory() && bfile.isDirectory()) {
            return DiffCommon.compareTo(afile.leafName.toLowerCase(),
                                  bfile.leafName.toLowerCase());
        }
        if (afile.isFile() && bfile.isFile()) {
            return DiffCommon.compareTo(afile.leafName.toLowerCase(),
                                  bfile.leafName.toLowerCase());
        }
        // Place directories before files
        if (afile.isDirectory()) {
            return -1;
        }
        return 1;
    }
}

function Comparator() {
    this.useTimestamp = false;
    this.useSize = false;
    this.useContent = false;
}

Comparator.prototype = {
    prepare : function() {
        this._arrFunctions = [];
    
        if (this.useTimestamp) {
            this._arrFunctions.push(this._compareTimestamp);
        }
    
        // size and content are mutual exclusive
        if (this.useSize) {
            this._arrFunctions.push(this._compareSize);
        } else if (this.useContent) {
            this._arrFunctions.push(this._compareContent);
        }
    },
    
    compare : function(leftFolderStatus, rightFolderStatus) {
        for (var i in this._arrFunctions) {
            var result = this._arrFunctions[i](leftFolderStatus, rightFolderStatus);
            if (result != 0) {
                return result;
            }
        }
        return 0;
    },

    _compareTimestamp : function(leftFolderStatus, rightFolderStatus) {
        if (leftFolderStatus.file && rightFolderStatus.file) {
            return leftFolderStatus.file.lastModifiedTime - rightFolderStatus.file.lastModifiedTime;
        }
        return 0;
    },
    
    _compareSize : function(leftFolderStatus, rightFolderStatus) {
        if (leftFolderStatus.file && rightFolderStatus.file) {
            return leftFolderStatus.file.fileSize - rightFolderStatus.file.fileSize;
        }
        return 0;
    },
    
    _compareContent : function(leftFolderStatus, rightFolderStatus) {
        // not implemented yet
        return 0;
    }
}