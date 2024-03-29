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

var gDiffSelectLine = {
    onLoad : function() {
        try {
            this.data = window.arguments[0];
            this.initControls();
        } catch (err) {
            alert(err);
        }
        window.sizeToContent();
    },

    initControls : function() {
        this.lineNumber = document.getElementById("line-number-text");
        this.destinationView = document.getElementById("destination-view");

        this.initValues();
    },

    initValues : function() {
        if (this.data.lineNumber) {
            this.lineNumber.value = this.data.lineNumber;
        }
        this.destinationView.selectedIndex = this.data.atLeft ? 0 : 1;
    },

    onOk : function() {
        var isValid = /^[0-9]+$/.test(this.lineNumber.value);
        if (!isValid) {
            alert(this.lineNumber.getAttribute("invalidnumber"));
            this.lineNumber.focus();
            return false;
        }
        this.data.lineNumber = new Number(this.lineNumber.value);
        this.data.atLeft = this.destinationView.selectedIndex == 0;
        this.data.isOk = true;
        return true;
    },

    onCancel : function() {
        this.data.isOk = false;
        return true;
    }
}