var Game = function (config) {
    if (!config) {
        config = {};
    }
    var self = this;
    self.background = new DisplayList();
    self.displayList = new DisplayList();
    self.controllers = config.controllers || null;

    // viewport
    self.config = {
        width: config.width || 600,
        height: config.height || 400
    };

    // setup and load tilemap
    if (config.hasOwnProperty('area') && config.area.current) {
        self.Area.current = config.area.current;
        self.Area.x = config.area.x || 0;
        self.Area.y = config.area.y || 0;
        self.Area.bottom = self.config.height;
        self.Area.right = self.config.width;
    }

    // devicePixelRatio
    self.devicePixelRatio = window.devicePixelRatio || 1;

    // autorender the canvas
    self.autorender = config.autorender || true;

    if (self.controllers) {
        self.setupControllers();
    }

    return self;
};

Game.prototype = {
    Area: {
        background: null,
        current: '',
        top: 0,
        right: 0,
        left: 0,
        bottom: 0
    },
    Sprites: [],
    /* is this high DPI canvas, or regular */
    backing_store_ratio: null,
    canvas_ratio: 0,
    listeners: [], // array of listeners
    listener_map: {},
    observers: [], // array of elements listening for actions
    observer_map: {},
    remotes: {},
    tiles: {},
    TileMaps: {},
    // canvas engine
    ui: {
        canvas: null,
        context: null,
        buffer: null,
        buffer_context: null,
        background: null,
        background_context: null,
        upscale: false
    }
};

/**
 * Setup Remote Custom Events (gamepad API, websockets, etc)
 *
 * @method setupControllers
 */
Game.prototype.setupControllers = function (controllers) {
    // check controllers param
    if (!controllers) {
        controllers = this.controllers;
        if (!controllers) {
            throw new Error("Controllers being setup in setupControllers should exist.... ");
        }

    }
    var i,
        length = controllers.length;

    for (i = 0; i < length; i++) {
        this.setupController(controllers[i]);
    }

};

/**
 * Ensure the individual controller can be setup
 * validate it has the following properties 'type', 'constructor', 'method'
 *
 * @method setupController
 */
Game.prototype.setupController = function (controller) {
    var valid = false;

    if (!controller.hasOwnProperty("type") || !controller.hasOwnProperty("context") || !controller.hasOwnProperty("method")) {
        throw new Error("Controller is missing gamepad, constructor, or method");
    }

    if (!this.remotes.hasOwnProperty(controller.type)) {
        this.remotes[controller.type] = controller.context;
        // trigger the first method method
        this.remotes[controller.type][controller.method].apply(controller.context, []);
        this.observer_map[controller.type] = [];
    }

};

/**
 * Add support for Remote Controlled Events (controller API, websockets)
 * Really just a proxy event
 *
 * @method handleRemote
 */
Game.prototype.handleRemote = function (event) {
    this.handleEvent(event);
};

/**
 * Catch all event handler
 *
 * @method handleEvent
 */
Game.prototype.handleEvent = function (event) {
    var i, l, item;
    if (this.observer_map.hasOwnProperty(event.type)) {
        l = this.observer_map[event.type].length;
        for (i = 0; i < l; i++) {
            item = this.observer_map[event.type][i];
            if (item.context && item.trigger) {
                item.context[item.trigger].apply(item.context, [event]);
            }
        }
    }
};

/**
 * Enable the engine to easily track a entity (Entity/Character/Hero)
 * @param entity
 */
Game.prototype.trackedEntity = null;
Game.prototype.trackEntity = function (entity) {
    // keep in center of viewport
    this.trackedEntity = entity;
};

Game.prototype.checkTracking = function() {
    if (this.trackedEntity && this.trackedEntity.hasOwnProperty("cameraTrack") && this.trackedEntity.state != "idle") {
        var entityActualX = this.trackedEntity.x + this.trackedEntity.width;
        var entityActualY = this.trackedEntity.y + this.trackedEntity.height;
        var viewportX = this.Area.background.renderArea.viewport.x;
        var viewportY = this.Area.background.renderArea.viewport.y;
        var midPointX = viewportX + this.Area.background.renderArea.viewport.width/2;
        var midPointY = viewportY + this.Area.background.renderArea.viewport.height/2;

        // if the entity's x is less than the midpoint of the scene
        // and the midpoint is greater than the width of the stage
        if ((this.trackedEntity.x < midPointX) && (midPointX > this.Area.background.renderArea.viewport.width/2)) {
            // then keep the entity in view by shifting the viewport to the left
            // by one/fourth the tile size per redraw
            // until our condition is met
            this.Area.background.renderArea.viewport.x -= this.Area.background.renderArea.tileSize/4;
        }

        // if the entity's x is greater than the midpoint of the scene
        // and the viewportX + the scene width is less than the total width of the background area (full tile map)
        // then shift the viewport (camera) to the right to keep entity in view
        if ((this.trackedEntity.x > midPointX) &&
            (viewportX + this.Area.background.renderArea.viewport.width) < this.Area.background.renderArea.background.width) {
            this.Area.background.renderArea.viewport.x += this.Area.background.renderArea.tileSize/4;
        }

        // if the entity's y is less than the midPointY
        // and the midPointY is greater than the height of the viewport
        if ((this.trackedEntity.y < midPointY) && (midPointY > this.Area.background.renderArea.viewport.height/2)) {
            // then track up
            this.Area.background.renderArea.viewport.y -= this.Area.background.renderArea.tileSize/4;
        }

        // if the entity's y is greater than the midpointY
        // and the midpointY is less than the total height of the background - half of the viewport
        if ((this.trackedEntity.y > midPointY) &&
            (midPointY < (this.Area.background.renderArea.background.height - this.Area.background.renderArea.viewport.height/2))) {
            this.Area.background.renderArea.viewport.y += this.Area.background.renderArea.tileSize/4;
        }


    }
};

/**
 * Add event listeners that can trigger events to observers
 *
 * @method addListener
 */
Game.prototype.addListener = function (target, type) {
    var length;
    if (!this.listener_map.hasOwnProperty(type)) {
        this.listeners.push(target.addEventListener(type, this.handleEvent.bind(this), false));
        // store the index in the listeners array
        length = this.listeners.length - 1;
        this.listener_map[type] = length; // not target-type
        return true;
    }
    return false;
};

/**
 * Adds an Observer to the game list
 * @note One can add observers prior to initializing actual event listening
 *
 * @method addObserver
 */
Game.prototype.addObserver = function (observer, type, trigger) {
    var length, i;
    if (!this.observer_map.hasOwnProperty(type)) {
        this.observer_map[type] = []; // great a new Array to hold these goodies
    }
    length = this.observer_map[type].length;
    for (i = 0; i < length; i++) {
        if (this.observer_map[type][i].context === observer) {
            return false;
        }
    }
    this.observer_map[type].push({
        context: observer,
        trigger: trigger
    });
    return true;
};

/**
 * Sets up and initializes all canvas contexts etc
 */
Game.prototype.init = function () {
    var main = document.getElementById("body"),
        wrapper = document.createElement('div'),
        nw = null,
        nh = null;

    wrapper.classList.add("fluid");

    this.ui.canvas = document.createElement("canvas");
    this.ui.canvas.classList.add("game");
    this.ui.canvas.width = this.config.width;
    this.ui.canvas.height = this.config.height;
    this.ui.canvas.style.width = this.config.width + "px";
    this.ui.canvas.style.height = this.config.height + "px";
    this.ui.context = this.ui.canvas.getContext('2d');

    /* cache the backingStore ratio */
    function getBackingStoreRatio(context) {
        return context.webkitBackingStorePixelRatio ||
            context.mozBackingStorePixelRatio ||
            context.msBackingStorePixelRatio ||
            context.oBackingStorePixelRatio ||
            context.backingStorePixelRatio || 1;
    }

    this.backing_store_ratio = getBackingStoreRatio(this.ui.context);
    // used to render correctly on retina (high DPI canvas)
    this.canvas_ratio = this.devicePixelRatio / this.backing_store_ratio;

    if (this.Area.current != '') {
        /*
         var b_canvas = document.createElement('canvas');
         b_canvas.width = config.width * config.tilewidth;
         b_canvas.height = config.height * config.tileheight;
         */
        var backgroundConfig = Engine.TileMaps[this.Area.current];
        var backgroundWidth = backgroundConfig.width * backgroundConfig.tilewidth;
        var backgroundHeight = backgroundConfig.width * backgroundConfig.tileheight;
        this.ui.buffer = document.createElement("canvas");
        this.ui.buffer.classList.add("hidden");
        this.ui.buffer.classList.add("buffer");
        this.ui.buffer.width = backgroundWidth;
        this.ui.buffer.height = backgroundHeight;
        /*this.ui.buffer.style.width = this.config.width + "px";
         this.ui.buffer.style.height = this.config.height + "px";*/
        this.ui.buffer_context = this.ui.buffer.getContext('2d');

        this.ui.background = document.createElement("canvas");
        this.ui.background.classList.add("hidden");
        this.ui.background.classList.add("background");
        this.ui.background.width = backgroundWidth;
        this.ui.background.height = backgroundHeight;
        /*this.ui.background.style.width = this.config.width + "px";
         this.ui.background.style.height = this.config.height + "px";*/
        //this.ui.background_context = this.ui.background.getContext('2d');
        this.Area.background = new TiledMap(backgroundConfig, this.ui.background, this);
        this.Area.background.preload();
        this.Area.background.updateViewport({
            x: this.Area.x,
            y: this.Area.y,
            width: this.config.width,
            height: this.config.height
        });
        this.renderBackground();
    }

    // upscale for retina
    if (this.ui.upscale) {
        nw = this.ui.canvas.width * this.canvas_ratio;
        nh = this.ui.canvas.height * this.canvas_ratio;

        this.ui.canvas.width = nw;
        this.ui.canvas.height = nh;
        this.ui.buffer.width = nw;
        this.ui.buffer.height = nh;
        this.ui.background.width = nw;
        this.ui.background.height = nh;

        // scale the context to counter the fact that we've manually scaled
        // our canvas element
        this.ui.context.scale(this.canvas_ratio, this.canvas_ratio);
        this.ui.buffer_context.scale(this.canvas_ratio, this.canvas_ratio);
        this.ui.background_context.scale(this.canvas_ratio, this.canvas_ratio);
    }

    wrapper.appendChild(this.ui.canvas);
    wrapper.appendChild(this.ui.buffer);
    wrapper.appendChild(this.ui.background);
    main.appendChild(wrapper);
};

/*
 self.map = {
 type: "world",
 origin: [0,0],
 bounds: null, // bounds are origin point, width x height rectangle at tile size offset
 tile_size: config.tile_size || [16,16] // sets up a 16x16 tile size for viewport
 };
 */
Game.prototype.setup = function () {
    this.tiles.map = [];
};

Game.prototype.handleKeypress = function (key, cb) {
    var keyMap = {
        39: "right",
        40: "down",
        37: "left",
        38: "up"
    }, key = keyMap[key];
    if (cb) {
        cb.apply(null, [key]);
    }
};

Game.prototype.renderLayer = function (list, buffer, buffer_context) {
    if (!list || !buffer || !buffer_context) {
        return;
    }
    var i, length, item;
    // clear the buffer
    buffer_context.clearRect(0,0, this.ui.background.width, this.ui.background.height);
    length = list.items.length;

    for (i = 0; i < length; i++) {
        item = list.items[i];
        item.render(buffer_context);
    }
};

/**
 * Handles rendering the background context
 */
Game.prototype.renderBackground = function () {
    this.renderLayer(this.background, this.ui.background, this.ui.background_context);
};

/**
 * Handles rendering the main canvas in the animation frame
 */
Game.prototype.render = function () {
    if (this.autorender) {
        window.requestAnimationFrame(this.render.bind(this), this.ui.canvas);
    }
    this.renderLayer(this.displayList, this.ui.buffer, this.ui.buffer_context);
    this.checkTracking();
    this.ui.context.clearRect(0, 0, this.ui.canvas.width, this.ui.canvas.height);
    // can scale for highDPI here
    this.Area.background.preRender(); // this will call render as long as the background is dirty
    this.ui.context.drawImage(this.ui.background, -this.Area.background.renderArea.viewport.x,
        -this.Area.background.renderArea.viewport.y);
    this.ui.context.save();

    this.ui.context.drawImage(this.ui.buffer, -this.Area.background.renderArea.viewport.x,
        -this.Area.background.renderArea.viewport.y);
    this.ui.context.restore();
};

window.Game = Game;
