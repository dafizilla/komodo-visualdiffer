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

var gChooseCompare = {
    onLoad : function() {
        try {
            this.initControls();
        } catch (err) {
            alert(err);
        }
        sizeToContent();
    },

    initControls : function() {
        this.leftFolderTextBox = document.getElementById("left-folder-textbox");
        this.rightFolderTextBox = document.getElementById("right-folder-textbox");

        this.leftFileTextBox = document.getElementById("left-file-textbox");
        this.rightFileTextBox = document.getElementById("right-file-textbox");
        this.radioGroup = document.getElementById("fileobject-radiogroup");
        this.sessionList = document.getElementById("session-list");

        this.radioGroup.addEventListener("RadioStateChange", this.onRadioStateChange, true);

        this.data = window.arguments[0];

        this.initValues();
    },

    initValues : function() {
        this.radioGroup.selectedIndex = 0;

        this.fillSessionList(false);
        // listener doesn't receive immediately notification so use a timeout
        //window.setTimeout(function() {
        //    document.getElementById("fileobject-radiogroup").selectedIndex = 1;
        //    }, 100);
    },

    fillSessionList : function(removeAllItems) {
        if (removeAllItems) {
            this.sessionList.removeAllItems();
        }

        var sessions = this.data.manager.sessions;
        for (var i = 0; i < sessions.length; i++) {
            this.sessionList.appendItem(sessions[i].name);
        }
    },

    onAccept : function() {
        try {
        var retVal = window.arguments[0];

        if (this.radioGroup.selectedItem.id == "folders-radio") {
            retVal.compareFiles = false;
            var errorMessage = VisualDifferCommon.getLocalizedMessage("invalid.folder");
            if (this.leftFolderTextBox.isFileValid(errorMessage)
                && this.rightFolderTextBox.isFileValid(errorMessage)) {
                retVal.leftPath = this.leftFolderTextBox.value;
                retVal.rightPath = this.rightFolderTextBox.value;

                this.leftFolderTextBox.addToMRU();
                this.rightFolderTextBox.addToMRU();
                this.setupFolderSessionSelected();
            } else {
                return false;
            }
        } else {
            retVal.compareFiles = true;
            var errorMessage = VisualDifferCommon.getLocalizedMessage("invalid.file");
            if (this.leftFileTextBox.isFileValid(errorMessage)
                && this.rightFileTextBox.isFileValid(errorMessage)) {
                retVal.leftPath = this.leftFileTextBox.value;
                retVal.rightPath = this.rightFileTextBox.value;

                this.leftFileTextBox.addToMRU();
                this.rightFileTextBox.addToMRU();
            } else {
                return false;
            }
        }
        } catch (err) {
            VisualDifferCommon.log("chooseCompare.onAccept " + err);
            alert("onAccept " + err);
        }
        retVal.isOk = true;
        return true;
    },

    setupFolderSessionSelected : function() {
        if (this.data.selectedSessionIndex >= 0) {
            var session = this.data.manager.sessions[this.data.selectedSessionIndex];
            // selected paths differ from session
            if (this.leftFolderTextBox.value != session.leftPath
                || this.rightFolderTextBox.value != session.rightPath) {
                this.data.selectedSessionIndex = -1;
            }
        }
    },

    onCancel : function() {
        var retVal = window.arguments[0];
        retVal.isOk = false;
    },

    onRadioStateChange : function (event) {
        var showItem = null;
        var hideItem = null;

        if (document.getElementById("folders-radio").selected) {
            showItem = "folders-box";
            hideItem = "files-box";
        } else if (document.getElementById("files-radio").selected) {
            showItem = "files-box";
            hideItem = "folders-box";
        }
        if (showItem) {
            document.getElementById(showItem).removeAttribute("collapsed");
            document.getElementById(hideItem).setAttribute("collapsed", "true");
        }
    },

    onSelectSession : function() {
        var idx = this.sessionList.selectedIndex;
        // If no session is selected the data index is correctly updated
        this.data.selectedSessionIndex = idx;
        if (idx >= 0) {
            var session = this.data.manager.sessions[idx];

            this.leftFolderTextBox.value = session.leftPath;
            this.rightFolderTextBox.value = session.rightPath;
            this.radioGroup.selectedIndex = 0; // folders

            var myEvent = document.createEvent("Events");
            myEvent.initEvent("RadioStateChange", true, true);
            this.radioGroup.dispatchEvent(myEvent);
        }
    },

    onDblClickSession : function() {
        this.data.selectedSessionIndex = this.sessionList.selectedIndex;
        document.documentElement.acceptDialog();
    },

    onRemoveSession : function() {
        var idx = this.sessionList.selectedIndex;
        if (idx >= 0) {
            this.data.isSessionListChanged = true;
            this.data.manager.removeSession(idx);
            this.sessionList.removeItemAt(idx);

            var rowCount = this.data.manager.sessions.length;
            if (rowCount > 0) {
                this.sessionList.selectedIndex = rowCount == idx ? idx - 1 : idx;
            }

            this.leftFileTextBox.value = "";
            this.rightFileTextBox.value = "";

            this.leftFolderTextBox.value = "";
            this.rightFolderTextBox.value = "";

            this.onSelectSession();
        }
    },

    onRenameSession : function() {
        var idx = this.sessionList.selectedIndex;
        if (idx >= 0) {
            var newName = ko.dialogs.prompt(null,
                        VisualDifferCommon.getLocalizedMessage("session.name"),
                        this.data.manager.sessions[idx].name,
                        VisualDifferCommon.getLocalizedMessage("session.rename"));
            if (newName == null || this.data.manager.sessions[idx].name == newName) {
                return;
            }

            if (VisualDifferCommon.trim(newName).length == 0) {
                alert(VisualDifferCommon.getLocalizedMessage("session.invalid.name"));
                return;
            }

            if (this.data.manager.findSessionIndexByName(newName) < 0) {
                this.data.isSessionListChanged = true;
                this.data.manager.sessions[idx].name = newName;
                this.data.manager.sortSessions();
                var newPos = this.data.manager.findSessionIndexByName(newName);

                this.sessionList.removeItemAt(idx);

                // Check position due to a bug in insertItemAt that
                // crashes when insert at end
                if (newPos == this.sessionList.getRowCount()) {
                    this.sessionList.appendItem(newName);
                } else {
                    this.sessionList.insertItemAt(newPos, newName);
                }
                this.sessionList.selectedIndex = newPos;
                this.onSelectSession();
            } else {
                alert(VisualDifferCommon.getLocalizedMessage("session.name.already.in.use"));
            }
        }
    }
};