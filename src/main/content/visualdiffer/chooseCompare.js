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
            this.ko = VisualDifferCommon.findKomodo(opener);
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

        this.radioGroup.addEventListener("RadioStateChange", this.onRadioStateChange, true);
                
        this.initValues();
    },

    initValues : function() {
        this.radioGroup.selectedIndex = 0;
        
        // listener doesn't receive immediately notification so use a timeout
        //window.setTimeout(function() {
        //    document.getElementById("fileobject-radiogroup").selectedIndex = 1;
        //    }, 100);
    },

    onAccept : function() {
        try {
        var retVal = window.arguments[0];

        if (this.radioGroup.selectedItem.id == "folders-radio") {
            retVal.compareFiles = false;
            if (this.checkDirectory(this.leftFolderTextBox)
                && this.checkDirectory(this.rightFolderTextBox)) {
                retVal.leftPath = this.leftFolderTextBox.value;
                retVal.rightPath = this.rightFolderTextBox.value;

                this.ko.mru.addFromACTextbox(this.leftFolderTextBox);
                this.ko.mru.addFromACTextbox(this.rightFolderTextBox);
            } else {
                return false;
            }
        } else {
            retVal.compareFiles = true;
            if (this.checkFile(this.leftFileTextBox)
                && this.checkFile(this.rightFileTextBox)) {
                retVal.leftPath = this.leftFileTextBox.value;
                retVal.rightPath = this.rightFileTextBox.value;

                this.ko.mru.addFromACTextbox(this.leftFileTextBox);
                this.ko.mru.addFromACTextbox(this.rightFileTextBox);
            } else {
                return false;
            }
        }
        } catch (err) {
            alert(err);
        }
        retVal.isOk = true;
        return true;
    },

    checkDirectory : function(textBox) {
        try {
            var file = VisualDifferCommon.makeLocalFile(textBox.value);
            if (file.exists() && file.isDirectory()) {
                return true;
            }
        } catch (err) {
            this.ko.logging.getLogger("ko.main")
                .warn("checkDirectory = " + err);
        }
        alert("Invalid directory ");
        textBox.setSelectionRange(0, textBox.value.length);
        textBox.focus();

        return false;
    },

    checkFile : function(textBox) {
        try {
            var file = VisualDifferCommon.makeLocalFile(textBox.value);
            if (file.exists() && file.isFile()) {
                return true;
            }
        } catch (err) {
            this.ko.logging.getLogger("ko.main")
                .warn("checkFile = " + err);
        }
        alert("Invalid file");
        textBox.setSelectionRange(0, textBox.value.length);
        return false;
    },
    
    onCancel : function() {
        var retVal = window.arguments[0];
        retVal.isOk = false;
    },

    onRadioStateChange : function (event) {
        var showItem;
        var hideItem;

        if (event.target.selected) {
            switch (event.target.id) {
                case "folders-radio":
                    showItem = "folders-box";
                    hideItem = "files-box";
                    break;
                case "files-radio":
                    showItem = "files-box";
                    hideItem = "folders-box";
                    break;
            }
            document.getElementById(showItem).removeAttribute("collapsed");
            document.getElementById(hideItem).setAttribute("collapsed", "true");
        }
    },

    onBrowse : function(event, targetId, pickType) {
        var target = document.getElementById(targetId);
        
        if (pickType == "file") {
            VisualDifferCommon.browseFile(target.value, null, target);
        } else if (pickType == "folder") {
            VisualDifferCommon.browseDirectory(target.value, null, target);
        } else {
            alert("Invalid pickType = " + pickType);
            this.ko.logging.getLogger("ko.main")
                .warn("Invalid pickType = " + pickType);
        }
    }
};