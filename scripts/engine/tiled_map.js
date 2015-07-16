/**
 * Tiled Importer
 * Bring your tiled maps into the game engine
 */

var TiledMap = function (tiled_config, canvas, gameContext) {
	this.config = tiled_config;
	this.images = {};
	this.loaded = false;
	this.loading = {};
    this.isReady = false;
	this.toload = 0;
    this.gameContext = gameContext;
    this.renderArea = {
        dirty: false,
        viewport: {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        },
        background: {
            width: 0,
            height: 0
        },
        tileSize: 0,
        backingCanvas: canvas,
        backingContext: canvas.getContext('2d')
    };
    this.collidables = {
    	objects: [],
    	gameDisplayListIsTracking: false
    };
	return this;
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
    this.buildAndRenderBaseCanvas(this.config, function (scope) {
        var i = 0;
        var layers = scope.config.layers;
        var length = layers.length;
        var tile_sets = scope.config.tilesets;

        for (; i < length; i++) {
            if (layers[i].name === "collidable") {
                //console.log(layers[i]);
                if (layers[i].hasOwnProperty("objects")) {
                    scope.parseAllCollidableObjects(layers[i].objects);
                }
            } else {
                // layer order should be rendered in order so we can preserve the stacking context
                scope.renderLayer(layers[i], tile_sets[i]);
            }
        }
    });
};

/**
 * Ensure the backing canvas, and backing context are available before populating the original canvas
 * @param config is the config from tiled tmx to json
 * @param callback The functions to trigger next
 */
TiledMap.prototype.buildAndRenderBaseCanvas = function (config, callback) {
    // tilesize helps us understand the conversion from tiles to pixels
    this.renderArea.tileSize = config.tilewidth;

    // the background width is the pixel value
    this.renderArea.background.width = config.width * this.renderArea.tileSize;
    // the background height is the pixel value
    this.renderArea.background.height = config.height * this.renderArea.tileSize;

    // the main offline canvas - for prerender
    if (callback) {
        callback.apply(this, [this]);
    }
};

/**
 * Collision detection occurs between objects that are collidable
 * @param objectList The list of collidable objects (from collidable layer in tiled)
 */
TiledMap.prototype.parseAllCollidableObjects = function(objectList) {
	var xOffset = this.renderArea.viewport.x*this.renderArea.tileSize;
	var yOffset = this.renderArea.viewport.y*this.renderArea.tileSize;
	if (!this.collidables.gameDisplayListIsTracking) {
		var l = objectList.length;
		for (var i = 0; i < l; i++) {
			var object = objectList[i];
			var sprite = new Sprite(
                {
					type: object.type,
					x: object.x,
					y: object.y,
					width: 16,
					height: 16,
					collidable: true,
					showBounds: false,
					boundsColor: "red",
					image: 'images/sprites/misc/clear.gif',
					hitRect: {
						enabled: true,
						height: object.height,
						width: object.width - this.renderArea.tileSize,
						xOffset: 0,
						yOffset: 0
					},
					sx: 0
				}
            );
			this.gameContext.Sprites.push(sprite);
		}
		//console.log(this.gameContext.Sprites);
		var self = this;
		this.gameContext.Sprites.forEach(function (item) {
			self.gameContext.displayList.add(item);
		});
		this.collidables.gameDisplayListIsTracking = true;
	}
};

/**
 * This method is in charge of rendering the actual layers (environment, middle ground, etc)
 * @param layer
 * @param tile
 */
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
        renderObject;
    length = layer.data.length;
    /*
     if firstgid tells us the offset to the sprite image data, then we can create a psudeo grid using width and height of image
     if tile.imageheight = 80 and th = 16, then we get 5 tiles height
     if tile.imagewidth =  192 and tw = 16, then we get 12 tiles wide

     so tiles 1 - 12 are in first row
     tiles 13 - 24 are in the second row
    */
    //console.log("TiledMap.renderLayer (w: " + w + ", h: " + h + ", tw: " + tw + ", th: " + th);
    //console.log("tilewidth: " + tw + " tileheight: " + th + " tile image height: " + ih + " tile image width: " + iw);

    /**
     * used to isolate tilewidth/tileheight regions on the sprite sheet
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

    var renderGraph = calculateRenderGraph(ih,iw,th,tw);
    for (i=0; i<length; i++) {
        if (layer.data[i] !== 0) {
            // need to track the current count across the tiles so we can shift to next column, rows efficiently
            data = renderGraph.tiles[layer.data[i]-tile.firstgid];
            // if the render object is just a line
            // we should be able to move the non-damaged rectangles around the screen
            renderObject = {
                image: tile.sprite,
                offsetX: data.sx,
                offsetY: data.sy,
                width: tw,
                height: th,
                x: (col)*tw,
                y: (row)*th
            };
            // pre-render to the internal backing context
            this.renderItem(this.renderArea.backingContext, renderObject);
            renderObject = null;
        }
        col += 1;
        if (col === w) {
            col = 0;
            row += 1;
        }
    }
    this.isReady = true;
    //console.timeEnd("render_" + tile.name);
};

/**
 * This will render the contents of the tilemap and apply against the backing context
 * @param context The canvas.getContext('2d')
 * @param params The image, offsets, etc to clamp and crop
 */
TiledMap.prototype.renderItem = function (context, params) {
    
    if (!context) {
        if (!this.canvas_context) {
            throw new Error("Cannot draw to the canvas if no context is supplied");
        }
        context = this.renderArea.backingContext;
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

/**
 * When you need to update the viewport, then send the x,y,width,height etc
 * @param params the object that has x,y,width,height properties
 */
TiledMap.prototype.updateViewport = function (params) {
    var isDirty = false;
    if (!params) {
        params = {};
    }
    if (params.x) {
        this.renderArea.viewport.x = params.x;
        isDirty = true;
    }
    if (params.y) {
        this.renderArea.viewport.y = params.y;
        isDirty = true;
    }
    if (params.width) {
        this.renderArea.viewport.width = params.width;
        isDirty = true;
    }
    if (params.height) {
        this.renderArea.viewport.height = params.height;
        isDirty = true;
    }
    // apply all updates to the viewport then release the dirty flag
    if (isDirty) {
        this.renderArea.dirty = true;
    }
};

/**
 * When the tilemap is rendered, it will render only the current viewport
 * @param renderContext This is the main visible context to render to (viewport)
 * @param backgroundContext This is the backgroundContext to render from
 */
/*
TiledMap.prototype.render = function (renderContext) {
    if (this.renderArea.dirty) {
        this.isReady = false;
        var viewport = this.renderArea.viewport;
        var imageData = renderContext.getImageData(viewport.x, viewport.y, viewport.width, viewport.height);
        renderContext.putImageData(imageData,0,0);
        this.renderArea.dirty = false;
        this.isReady = true;
    }
};
*/
/**
 * Override for render method
 */
TiledMap.prototype.preRender = function () {
    //if (this.isReady) {
    //    this.render(this.renderArea.backingContext);
   // }
};

