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
var VisualDifferCommon = {
    readFile : function(fullPath) {
        var file = Components
                        .classes["@activestate.com/koFileEx;1"]
                        .createInstance(Components.interfaces.koIFileEx);
        file.path = fullPath;
        
        file.open('rb');
        
        var content = file.readfile();
        file.close();
        
        return content;
    },
    
    saveFile : function(filePath, selection) {
        if (filePath == "") {
            return;
        }
        var file = Components
                        .classes["@activestate.com/koFileEx;1"]
                        .createInstance(Components.interfaces.koIFileEx);
        file.path = filePath;
        
        file.open('w');
        
        file.puts(selection);
        file.close();
    },
    
    copyToClipboard : function(str) {
        Components.classes["@mozilla.org/widget/clipboardhelper;1"]
            .getService(Components.interfaces.nsIClipboardHelper)
            .copyString(str);
    }
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

VisualDifferCommon.findKomodo = function(parentWindow) {
    while (parentWindow && !("ko" in parentWindow)) {
        parentWindow = parentWindow.opener;
    }
    return parentWindow.ko;
}
