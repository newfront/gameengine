/*global Image, Y, document, window */

(function () {
    "use strict";

    /**
     * Handles reading / writing to FileSystem
     */
    var FileSystem = function () {
        var that = this;
        that.available = (window.FileReader === undefined) ? false : true;
        return that;
    };

    /**
     * Gets files from event - drop
     *
     * @method listFiles
     * @param {Event} e The event
     */
    FileSystem.prototype.listFiles = function (e, cb) {
        e.stopPropagation();
        e.preventDefault();
        var files = e.dataTransfer.files, filelist = [], i, f, l;

        l = files.length;

        for (i = 0; i < l; i += 1) {
            f = files[i];
            filelist.push(f);
        }
        if (cb && typeof cb === "function") {
            cb.appy(null, [filelist]);
        } else {
            return filelist;
        }
    };

    FileSystem.prototype.getFiles = function (filelist, strategy, cb) {
        var i, l, f, has_strategy = false;

        if (strategy && typeof strategy === "function") {has_strategy = true;}

        l = filelist.length;
        
        for (i = 0; i < l; i++) {
            f = filelist[i];
            if (has_strategy) {
                strategy.apply(null, [f]);
            } else {
                console.log(f);
            }
        }
    };

    FileSystem.prototype.readFile = function (file, type, regexp, cb) {
        var reader = new FileReader(file),
            type = (!type) ? 'readAsDataURL' : type,
            test = (regexp !== undefined) ? true : false;

        if (test) {if (!file.type.match(regexp)) { return false; }}

        reader.onload = function (e) {
            var target;
            if (e.total === e.loaded) {
                // file loaded
                target = e.target;
                if (cb && typeof cb === "function") {
                    cb.apply(null, [target.result]);
                } else {
                    return target.result;
                }
            };
        };
        reader.readAsDataURL(file);
    };

    window.FileSystem = FileSystem;

}());