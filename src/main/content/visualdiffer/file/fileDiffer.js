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
# Portions created by the Initial Developer are Copyright (C) 2007
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

var gFileDiffer = {
    onLoad : function() {
        try {
            this.lastUsedGotoLineNumber = null;

            this.initControls();
            this.leftTreeView.treeElement.focus();
        } catch (err) {
            alert(err);
        }
        sizeToContent();
    },

    makeDiff : function(leftFilePath, rightFilePath) {
        try {
        this.leftTreeView.filePath = "";
        this.rightTreeView.filePath = "";

        this.diffResults = this.createVisualDiffInfo(leftFilePath, rightFilePath);
        if (!this.diffResults) {
            return;
        }
        this.leftTreeView.init(this.diffResults.oldVisualLineStatus,
                        this.diffResults.oldRealLines);
        this.rightTreeView.init(this.diffResults.newVisualLineStatus,
                        this.diffResults.newRealLines);
        this.safeSelectIndex(this.leftTreeView, 0);
        this.leftTreeView.refresh();

        this.updateInputBoxes(leftFilePath, rightFilePath);
        } catch (err) {
            VisualDifferCommon.log("file makeDiff " + err);
            alert(err);
        }
    },

    createVisualDiffInfo : function(leftFilePath, rightFilePath) {
        var leftLines = "";
        var rightLines = "";

        if (leftFilePath != null && this._fileExists(leftFilePath)) {
            this.leftTreeView.filePath = leftFilePath;
            leftLines = VisualDifferCommon.readFile(leftFilePath).split(/\r\n|\n|\r/);
        } else {
            // make a diff with same file, this is necessary because getUnifiedDiffContent
            // works only with files not with file content
            leftFilePath = rightFilePath;
        }
        if (rightFilePath != null && this._fileExists(rightFilePath)) {
            this.rightTreeView.filePath = rightFilePath;
            rightLines = VisualDifferCommon.readFile(rightFilePath).split(/\r\n|\n|\r/);
        } else {
            // make a diff with same file, this is necessary because getUnifiedDiffContent
            // works only with files not with file content
            rightFilePath = leftFilePath;
        }
        if (leftLines == "" && rightLines == "") {
            // both sides are empty
            return null;
        }

        return DiffCommon.createVisualDiffInfo(
                DiffCommon.getUnifiedDiffContent(leftFilePath, rightFilePath)
                    .split(/\r\n|\n|\r/),
                leftLines,
                rightLines);
    },

    updateInputBoxes : function(leftFilePath, rightFilePath) {
        if (leftFilePath != null && this._fileExists(leftFilePath)) {
            this.leftFileTextBox.value = leftFilePath;
            this.leftFileTextBox.addToMRU();
        }

        if (rightFilePath != null && this._fileExists(rightFilePath)) {
            this.rightFileTextBox.value = rightFilePath;
            this.rightFileTextBox.addToMRU();
        }
    },

    initControls : function() {
        this.panelLayout = document.getElementById("panel-layout");
        this.panelSplitter = document.getElementById("panel-splitter");
        this.leftFileTextBox = document.getElementById("left-file-textbox");
        this.rightFileTextBox = document.getElementById("right-file-textbox");
        this.leftSelectedLine = document.getElementById("left-selected-line");
        this.rightSelectedLine = document.getElementById("right-selected-line");

        document.getElementById("left-tree").addEventListener("DOMAttrModified",
                        function(event) { gFileDiffer.onScroll(event);}, false);
        document.getElementById("right-tree").addEventListener("DOMAttrModified",
                        function(event) { gFileDiffer.onScroll(event);}, false);

        this.leftTreeView = new FileDifferTreeView(document.getElementById("left-tree"));
        this.rightTreeView = new FileDifferTreeView(document.getElementById("right-tree"));

        this.bundle = document.getElementById("strings");
        this.initValues();
    },

    initValues : function() {
        var leftPath = VisualDifferCommon.makeLocalFile(window.arguments[0]).leafName;
        var rightPath = VisualDifferCommon.makeLocalFile(window.arguments[1]).leafName;

        document.title = this.bundle.getFormattedString(
                    "file.compare.title", [leftPath, rightPath]);

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
        this.leftSelectedLine.value = this.leftTreeView.selectedText;
        this.rightSelectedLine.value = this.rightTreeView.selectedText;
    },

    onDblClick : function(event) {
        var arr = this.getTreeViewSortedById(event.target.parentNode.id);
        var selection = arr[0].selection;
        var items = arr[0].items;

        var startSelIdx = selection.currentIndex;
        var endSelIdx = selection.currentIndex;
        if (items[selection.currentIndex].status != "S") {
            while ((startSelIdx - 1) >= 0 && items[startSelIdx - 1].status != "S") {
                --startSelIdx;
            }
            while ((endSelIdx + 1) < items.length && items[endSelIdx + 1].status != "S") {
                ++endSelIdx;
            }
        }
        if (startSelIdx != endSelIdx) {
            this.selectionInProgress = true;
            selection.rangedSelect(startSelIdx, endSelIdx, false);
            this.selectionInProgress = false;
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

    onTextEntered : function(textbox, isLeftTextBox) {
        if (this._fileExists(textbox.value)) {
            var leftPath;
            var rightPath;

            if (isLeftTextBox) {
                leftPath = textbox.value;
                rightPath = this.rightTreeView.filePath;
            } else {
                leftPath = this.leftTreeView.filePath;
                rightPath = textbox.value;
            }
            this.makeDiff(leftPath, rightPath);
        }
    },

    onFileChanged : function(fullPath, isLeftTextBox) {
        if (isLeftTextBox) {
            this.makeDiff(fullPath.path, this.rightTreeView.filePath);
        } else {
            this.makeDiff(this.leftTreeView.filePath, fullPath.path);
        }
    },

    onMoveToDifference : function(event, moveToNext) {
        var currentPos = this.leftTreeView.selection.currentIndex + 1;
        var sections = this.diffResults.sections;
        var sectionIndex = 0;

        if (moveToNext) {
            for (sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
                var section = sections[sectionIndex];
                if (section.start > currentPos) {
                    break;
                }
            }
            if (sectionIndex < sections.length) {
                this.leftTreeView.selectAndEnsureVisible(sections[sectionIndex].start - 1);
            } else {
                alert(VisualDifferCommon.getLocalizedMessage("mo.more.differences"));
            }
        } else {
            for (sectionIndex = sections.length - 1; sectionIndex >= 0; sectionIndex--) {
                var section = sections[sectionIndex];
                if (section.end < currentPos) {
                    break;
                }
            }
            if (sectionIndex >= 0) {
                this.leftTreeView.selectAndEnsureVisible(sections[sectionIndex].start - 1);
            } else {
                alert(VisualDifferCommon.getLocalizedMessage("mo.more.differences"));
            }
        }
    },

    onCopySelection : function(event) {
        var focusedId = document.commandDispatcher.focusedElement.id;
        var arr = this.getTreeViewSortedById(focusedId);
        var view = arr[0];

        if (view) {
            var indexes = view.selectedIndexes;
            var str = "";
            for (i in indexes) {
                // TODO \n must use original line separator
                str += view.items[indexes[i]].text + "\n";
            }
            VisualDifferCommon.copyToClipboard(str);
        }
    },

    onSideBySide : function(toolbarButton) {
        var orient = toolbarButton.checked ? "horizontal" : "vertical";

        this.panelLayout.setAttribute("orient", orient);
        this.panelSplitter.setAttribute("orient", orient);
    },

    onGotoLine : function(event) {
        try {
        var focusedId = document.commandDispatcher.focusedElement.id;
        var data = {
                    lineNumber : this.lastUsedGotoLineNumber,
                    atLeft : focusedId == "left-tree",
                    isOk : false
                };

        window.openDialog("chrome://visualdiffer/content/file/gotoLine.xul",
                          "_blank",
                          "chrome,resizable=false,dependent=yes,modal=yes",
                          data);
        if (data.isOk) {
            var view = data.atLeft ? this.leftTreeView : this.rightTreeView;

            if (view.gotoLine(data.lineNumber)) {
                this.lastUsedGotoLineNumber = data.lineNumber;
            } else {
                alert(VisualDifferCommon
                      .getFormattedMessage("line.out.of.range", [data.lineNumber]));
            }
        }
        } catch (err) {
            alert(err);
        }
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
            VisualDifferCommon.log("getViewSortedById : Invalid id '" + id + "'");
        }
        return arr;
    },

    _fileExists : function(path) {
        try {
            var file = VisualDifferCommon.makeLocalFile(path);
            return file.exists() && file.isFile();
        } catch (err) {
            return false;
        }
    }
}

