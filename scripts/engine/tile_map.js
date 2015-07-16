/**
 * Tile Map is used to build and render a large group of non solid objects
 */

(function () {
    var TileMap = function (config) {
        var self = this;
        self.image_src = config.image || null;
        self.image = null;
        self.map = []; // map is 16x16 tiles
        self.width = config.width || null;
        self.height = config.height || null;
        self.x = config.x || 0;
        self.y = config.y || 0;
        self.ready = false;
        return self;
    };

    TileMap.prototype.onload = function (image) {
        this.image = image;
    };

    TileMap.prototype.preload = function (image_src) {

        if (!image_src && !this.image_src) {
            throw new Error("TileMap::preload requires a sprite image to load");
        }
        var image = new Image(),
            source = (image_src === undefined) ? this.image_src : image_src,
            self = this;
        image.src = source;
        image.onload = function () {
            self.ready = true;
            if (self.onload.apply(self, [image]));
        }
    };

    TileMap.prototype.render = function (context) {
        var i, length;
        length = this.map.length;

        for (i=0; i < length; i++) {
            this.renderItem(context, this.map[i]);
        }
    };

    // common render method to draw these tiles
    TileMap.prototype.renderItem = function (context, params) {
        context.save();
        context.translate(params.x, params.y);
        if (params.rotation) {
            context.rotate(params.rotation);
        }
        if (params.scaleX && params.scaleY) {
            context.scale(params.scaleX, params.scaleY);
        }
        context.drawImage(
            this.image, 
            params.offsetX,
            params.offsetY,
            params.width, 
            params.height, 
            params.x, 
            params.y, 
            params.width, 
            params.height
        );
        context.restore();
    };
    window.TileMap = TileMap;
}());

