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
function VisualDifferCommon() {
    return this;
}

VisualDifferCommon.locale = Components.classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://visualdiffer/locale/visualdiffer.properties");

VisualDifferCommon.isKomodo = Components.classes["@mozilla.org/xre/app-info;1"]
                        .getService(Components.interfaces.nsIXULAppInfo)
                        .name.indexOf("Komodo") >= 0;

VisualDifferCommon.readFile = function(fullPath) {
    var file = VisualDifferCommon.makeLocalFile(fullPath);
    var fileContent = VisualDifferCommon.read(file);

    return fileContent;
}

VisualDifferCommon.saveFile = function(fileName, fileContent) {
    var os = VisualDifferCommon.makeOutputStream(fileName);
    os.write(fileContent, fileContent.length);
    os.flush();
    os.close();
}

VisualDifferCommon.makeOutputStream = function(fileNameOrLocalFile, append) {
    const CONTRACTID_FOS = "@mozilla.org/network/file-output-stream;1";
    const nsFos = Components.interfaces.nsIFileOutputStream;

    var os = Components.classes[CONTRACTID_FOS].createInstance(nsFos);
    var flags = 0x02 | 0x08 | 0x20; // wronly | create | truncate
    if (append != null && append != undefined && append) {
        flags = 0x02 | 0x10; // wronly | append
    }
    var file = VisualDifferCommon.makeLocalFile(fileNameOrLocalFile);

    os.init(file, flags, 0600, 0);

    return os;
}


VisualDifferCommon.copyToClipboard = function(str) {
    Components.classes["@mozilla.org/widget/clipboardhelper;1"]
        .getService(Components.interfaces.nsIClipboardHelper)
        .copyString(str);
}

VisualDifferCommon.makeLocalFile = function(path, arrayAppendPaths) {
    var file;

    try {
        file = path.QueryInterface(Components.interfaces.nsILocalFile);
    } catch (err) {
        file = Components.classes["@mozilla.org/file/local;1"]
               .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(path);
    }

    if (arrayAppendPaths != null
        && arrayAppendPaths != undefined
        && arrayAppendPaths.length) {
        for (var i = 0; i < arrayAppendPaths.length; i++) {
            file.append(arrayAppendPaths[i]);
        }
    }
    return file;
}

VisualDifferCommon.makeFilePicker = function(win, title, mode, startDir) {
    const nsIFilePicker                 = Components.interfaces.nsIFilePicker;
    const CONTRACTID_FILE_PICKER        = "@mozilla.org/filepicker;1";

    if (mode == null || typeof(mode) == "undefined") {
        mode = nsIFilePicker.modeOpen;
    }
    if (win == null || typeof(win) == "undefined") {
        win = window;
    }

    var fp = Components.classes[CONTRACTID_FILE_PICKER]
                .createInstance(nsIFilePicker);
    fp.init(win, title, mode);

    if (startDir) {
        VisualDifferCommon.setDisplayDirectory(fp, startDir);
    }

    return fp;
}

VisualDifferCommon.setDisplayDirectory = function(filePicker, path) {
    try {
        var currDir = VisualDifferCommon.makeLocalFile(path);
        if (currDir.isFile()) {
            currDir = currDir.parent;
        }
        if (currDir.isDirectory()) {
            filePicker.displayDirectory = currDir;
        }
    } catch (err) {
        // simply don't set displayDirectory
    }
}

VisualDifferCommon.browseByMode = function(filePickerMode,
                                           startFileOrDir,
                                           title,
                                           domTextBox) {
    var picker = VisualDifferCommon.makeFilePicker(null,
                                title,
                                filePickerMode,
                                startFileOrDir);
    var res = picker.show();

    if (res != Components.interfaces.returnCancel) {
        if (domTextBox) {
            domTextBox.value = picker.file.path;
        }
        return picker.file;
    }
    return null;
}


VisualDifferCommon.browseFile = function(startFileOrDir, title, domTextBox) {
    return VisualDifferCommon.browseByMode(
                Components.interfaces.nsIFilePicker.modeOpen,
                startFileOrDir,
                title,
                domTextBox);
}

VisualDifferCommon.browseDirectory = function(startFileOrDir, title, domTextBox) {
    return VisualDifferCommon.browseByMode(
                Components.interfaces.nsIFilePicker.modeGetFolder,
                startFileOrDir,
                title,
                domTextBox);
}

VisualDifferCommon.formatDateFromMillisecs = function(millisecs) {
    const dateTimeContractID = "@mozilla.org/intl/scriptabledateformat;1";
    const dateTimeIID = Components.interfaces.nsIScriptableDateFormat;

    var dateTimeService = Components.classes[dateTimeContractID]
                                .getService(dateTimeIID);
    var dateStarted = new Date(millisecs);

    return dateTimeService.FormatDateTime("",
                dateTimeService.dateFormatShort,
                dateTimeService.timeFormatSeconds,
                dateStarted.getFullYear(),
                dateStarted.getMonth() + 1,
                dateStarted.getDate(),
                dateStarted.getHours(),
                dateStarted.getMinutes(),
                dateStarted.getSeconds());
}

VisualDifferCommon.log = function(msg) {
    if (VisualDifferCommon.isKomodo) {
        VisualDifferCommon.debug(msg);
    } else {
        ko.logging.getLogger("extensions.visualdiffer").warn(msg);
    }
}

VisualDifferCommon.read = function(file) {
    const CONTRACTID_FIS = "@mozilla.org/network/file-input-stream;1";
    const nsFis = Components.interfaces.nsIFileInputStream;
    const CONTRACTID_SIS = "@mozilla.org/scriptableinputstream;1";
    const nsSis = Components.interfaces.nsIScriptableInputStream;


    var str = "";
    var fiStream = Components.classes[CONTRACTID_FIS].createInstance(nsFis);
    var siStream = Components.classes[CONTRACTID_SIS].createInstance(nsSis);

    fiStream.init(file, 1, 0, false);
    siStream.init(fiStream);
    str += siStream.read(-1);
    siStream.close();
    fiStream.close();
    return str;
}

VisualDifferCommon.showFileInFileManager = function(path) {
    VisualDifferCommon.makeLocalFile(path).reveal();
}

VisualDifferCommon.getLocalizedMessage = function(msg) {
    return VisualDifferCommon.locale.GetStringFromName(msg);
}

VisualDifferCommon.getFormattedMessage = function(msg, ar) {
    return VisualDifferCommon.locale.formatStringFromName(msg, ar, ar.length);
}

VisualDifferCommon.getProfileDir = function() {
    return VisualDifferCommon.getPrefDir("PrefD");
}

VisualDifferCommon.getPrefDir = function(dir) {
    const CONTRACTID_DIR = "@mozilla.org/file/directory_service;1";
    const nsDir = Components.interfaces.nsIProperties;

    var dirService = Components.classes[CONTRACTID_DIR].getService(nsDir);
    return dirService.get(dir, Components.interfaces.nsILocalFile);
}

VisualDifferCommon.compareTo = function(str1, str2) {
    return str1 == str2 ? 0 : str1 < str2 ? -1 : 1;
}

/*
 * Split a filename in name and extension components
 * @param str the filename
 * @returns a two elements array index 0 => name index 1 => extension
 */
VisualDifferCommon.fnSplit = function(str) {
    var pos = str.lastIndexOf(".");
    var arr = [0, 0];
    if (pos < 0) {
        arr[0] = str;
        arr[1] = "";
    } else {
        arr[0] = str.substring(0, pos);
        arr[1] = str.substring(pos + 1);
    }
    return arr;
}

VisualDifferCommon.trim = function(str) {
    return str.replace(/^\s+/, "").replace(/\s+$/, "");
}

VisualDifferCommon.debug = function(message) {
    Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService)
            .logStringMessage(message);
}

VisualDifferCommon.logException = function(ex, msg) {
    var exMsg = ex;

    if ("fileName" in ex) {
        exMsg = ex.fileName + "(" + ex.lineNumber + ") : "
            + ex.name + " - " + ex.message + "\n\n"
            + ex.stack;
    }
    if (msg) {
        exMsg = msg + "\n" + exMsg;
    }
    VisualDifferCommon.log(exMsg);
    VisualDifferCommon.debug(exMsg);
}

VisualDifferCommon.simpleFormatIntNumber = function(intNumber, thousandsSep) {
    thousandsSep = typeof(thousandsSep) == "undefined" || thousandsSep == null
        ? "." : thousandsSep;
    var ret = intNumber < 0 ? "-" : "";
    intNumber = Math.abs(intNumber);
    var intStr = intNumber.toString();
    var remainder = intStr.length % 3;

    if (remainder == 0) {
        remainder = 3;
    }
    ret += intStr.substring(0, remainder);

    while (remainder < intStr.length) {
        ret += thousandsSep + intStr.substring(remainder, remainder + 3);
        remainder += 3;
    }
    return ret;
}

VisualDifferCommon.folderExists = function(path) {
    try {
        var file = VisualDifferCommon.makeLocalFile(path);
        return file.exists() && file.isDirectory();
    } catch (err) {
        return false;
    }
}

/**
 * the DOMKeyData is used by event handlers that don't have any info about
 * keyboard on their event objects (eg onSelect tree handler)
 * @param event mouse or key event
 */
VisualDifferCommon.DOMKeyData = function(event) {
    this.keyCode = undefined
    this.ctrlKey = false;
    this.shiftKey = false;
    this.metaKey = false;
}

VisualDifferCommon.DOMKeyData.prototype = {
    fillByEvent : function(event) {
        this.keyCode = event.keyCode; // will be undefined for mouse events
        this.ctrlKey = event.ctrlKey;
        this.shiftKey = event.shiftKey;
        this.metaKey = event.metaKey;
    },

    reset : function() {
        this.keyCode = undefined
        this.ctrlKey = false;
        this.shiftKey = false;
        this.metaKey = false;
    }
}