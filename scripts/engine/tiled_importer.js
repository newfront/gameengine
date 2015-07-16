/**
 * Tiled Importer
 * Bring your tiled maps into the game engine
 */

var TiledMap = function (tiled_config, canvas_context) {
	this.config = tiled_config;
	this.images = {};
	this.loaded = false;
	this.loading = {};
	this.toload = 0;
    this.drawingContext = canvas_context || null;
	return this;
}

TiledMap.prototype.parseConfig = function () {
	/*
	 config.height (in tiles not pixels)
	 config.layers (Array)
	   [0]
	     - data (Array)
	     - height
	     - name
	     - opacity
	     - type: (tilelayer)
	     - visible: true|false
	     - width
	     - x
	     - y
	 config.orientation
	 config.properties
	 config.tileheight
	 config.tilesets (Array)
	   [0]
	      - firstgrid: 1
	      - image: '../path',
	      - imageheight
	      - imagewidth
	      - margin
	      - name
	      - spacing
	      - tileheight
	      - tilewidth
	 config.tilewidth
	 config.width (in tiles not pixels)
	 config.version
	*/
};

TiledMap.prototype.preloadImage = function (tileset) {
	var loaded = false,
		img, self = this;

	if (!tileset.image) {
		throw new Error("Tileset requires an image is specified");
	}
	img = new Image();
	this.loading[tileset.name] = true;
	this.toload += 1;
	img.onload = function () {
		self.images[tileset.name] = img;
        tileset.sprite = img;
		self.imageLoadComplete(tileset.name);
	}
	img.src = tileset.image;
};

TiledMap.prototype.preload = function () {
	var length = this.config.tilesets.length,
		i;

	for (i=0; i < length; i++) {
		this.preloadImage(this.config.tilesets[i]);
	}
};

TiledMap.prototype.imageLoadComplete = function (name) {
	var image = this.images[name];
	if (this.loading[name]) {
		delete this.loading[name];
	}
	this.toload -= 1;
	if (this.toload === 0) {
		this.loaded = true;
		this.imagesLoaded();
	}
};

/**
 * @note: can override this with next step in the process if you like. eg. TiledMap.parseConfig().preload(); -> then render
 */
TiledMap.prototype.imagesLoaded = function () {
	var i, length, 
		layers = this.config.layers,
		tileset = this.config.tilesets;
	length = layers.length;

	for (i=0; i < length; i++) {
		// layer order should be rendered in order so we can preserve the stacking context
		this.renderLayer(layers[i], tileset[i]);
	}
};

TiledMap.prototype.renderLayer = function (layer, tile) {
    // benchmark
    //console.time("render_" + tile.name);
    // basic rendering of sprites to canvas running about 0.234ms for sprite (w=192, h=80) - note: a 4x5 grid tree takes 0.0655ms to render
    // basic rendering of sprites to canvas running about 1.8ms for sprite (w=208, h=16) painting all tiles on 320x320 canvas
    var i, length, 
        w = layer.width, 
        h = layer.height,
        tw = tile.tilewidth,
        th = tile.tileheight,
        ih = tile.imageheight,
        iw = tile.imagewidth,
        row = 0,
        col = 0,
        renderObject,
        renderGraph = null;

    length = layer.data.length;

    /*
     if firstgid tells us the offset to the sprite image data, then we can create a psudeo grid using width and height of image
     if tile.imageheight = 80 and th = 16, then we get 5 tiles height
     if tile.imagewidth =  192 and tw = 16, then we get 12 tiles wide

     so tiles 1 - 12 are in first row
     tiles 13 - 24 are in the second row
    */

    function calculateRenderGraph(ih, iw, th, tw) {

        // check if the tilemap has already been cached
        if (tile.hasOwnProperty("renderGraph")) {
            return tile.renderGraph;
        }

        var rows = ih / th,
            cols = iw / tw,
            i, count, arr, length, 
            row = 0,
            col = 0,
            result;

        length = rows*cols;
        arr = new Array(length);

        // now that we have an array we can fill it with row,col data for renderGraph of tileset

        for (i=0; i < length; i++) {
            // fill in data for tilemap
            arr[i] = {
                row: row,
                col: col,
                sx: col * tw,
                sy: row * th
            };
            col += 1;
            if (col >= cols) {
                row += 1;
                col = 0;
            }
        }

        result = {
            tiles: arr,
            rows: rows,
            cols: cols
        };

        if (!tile.hasOwnProperty("renderGraph")) {
            // cache the renderGraph to the tile object
            tile.renderGraph = result;
        }

        return result;

    }

    renderGraph = calculateRenderGraph(ih,iw,th,tw);


    // 12 * 16 = 192 (width of image is important when drawing these tile maps)
    for (i=0; i<length; i++) {
        if (layer.data[i] !== 0) {
            // need to track the current count across the tiles so we can shift to next column, rows efficiently
            data = renderGraph.tiles[layer.data[i]-tile.firstgid];

            renderObject = {
                image: tile.sprite,
                offsetX: data.sx,
                offsetY: data.sy,
                width: tw,
                height: th,
                x: (col+1)*tw,
                y: (row)*th
            }

            this.renderItem(this.drawingContext, renderObject);
            renderObject = null;
        }
        col += 1;
        if (col === w) {
            col = 0;
            row += 1;
        }
    }
    //console.timeEnd("render_" + tile.name);
};

TiledMap.prototype.renderItem = function (context, params) {
    
    if (!context) {
        if (!this.canvas_context) {
            throw new Error("Cannot draw to the canvas if no context is supplied");
            return;
        }
        context = this.canvas_context;
    }
    context.drawImage(
        params.image, 
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

