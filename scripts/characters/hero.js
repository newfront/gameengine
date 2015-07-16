/**
 * Create HERO character
 * extends sprite > character
 */

(function () {
    "use strict";
	var NULL = null;
    var FALSE = false;
    var TRUE = true;

    var Hero = function (params) {
        Entity.call(this, params);
        this.startAnimation();
        if (params != null) {
            if (params.hasOwnProperty("cameraTrack")) {
                this.cameraTrack = params.cameraTrack;
            }
        }
        this.backingCanvas = document.createElement('canvas');
        this.backingCanvas.width = this.width;
        this.backingCanvas.height = this.height;
        this.backingContext = this.backingCanvas.getContext('2d');
    };

    // todo it would be great if link could be rendered on his own canvas, then the animations etc can be optimized for the
    // tilesize, on the canvas

    // extend chain: Sprite::Entity::Hero
    Hero.prototype = Entity.prototype;

    Hero.prototype.animating = TRUE;

    Hero.prototype.cameraTrack = false;

    Hero.prototype.startAnimation = function () {
        this.handleMovement();
    };

    // Character State Map
    Hero.prototype.state = {
        current: "idle",

        idle: {
            sequence: 0,
            current: 0,
            map: [0]
        },
        /**
         * Walking state maps the hero's animated movements in all 4 directions
         * @property walking
         * @type Object
         */
        walking: {
            sequence: 9,
            current: 0,
            left: [0,35,70,106,142,177,212,248,283],
            right: [318,353,388,424,461,496,530,565,600],
            down: [635,672,706,743,778,814,849,884,918],
            up: [953,991,1026,1061,1096,1131,1165,1200,1235]
        },
        lastType: {
            type: "idle",
            map: "map"
        },
        attacking: {},
        dying: {},
        /**
         * Heading keeps track of the character's direction of movement
         * @property heading
         * @type Object
         */
        heading: {n: 0,e: 0,s: 0,w: 0}
    };

    Hero.prototype.handleMovement = function () {

        var spriteMap = {
            type: "idle",
            map: "map"
        };

        this.state.current = "idle";

        if (this.state.heading.n) {
            if (!this.mutators.direction[0]) {
                this.y -= this.speed;
            }
            this.state.current = "walking";
            spriteMap = {
                type: "walking",
                map: "up"
            };
        }

        if (this.state.heading.e) {
            if (!this.mutators.direction[1]) {
                this.x += this.speed;
            }
            this.state.current = "walking";
            spriteMap = {
                type: "walking",
                map: "right"
            };
        }

        if (this.state.heading.s) {
            if (!this.mutators.direction[2]) {
                this.y += this.speed;
            }
            this.state.current = "walking";
            spriteMap = {
                type: "walking",
                map: "down"
            };
        }

        if (this.state.heading.w) {
            if (!this.mutators.direction[3]) {
                this.x -= this.speed;    
            }
            this.state.current = "walking";
            spriteMap = {
                type: "walking",
                map: "left"
            };
        }

        this.renderSpriteState(spriteMap);

        if (this.animating) {
            window.requestAnimationFrame(this.startAnimation.bind(this));
        }
    };

    /**
     * Handles rendering the sprite based off of a state map
     * @param {object} config Is the sprite type and map (config.type, config.map)
     */
    Hero.prototype.renderSpriteState = function (config) {
        var state, map, nextIndex, 
            usedSave = false;
        
        if (!this.state[config.type] || !this.state[config.type][config.map]) {
            // log error
            return;
        }

        // no need to render this sprite since it is idle
        if (config.type === "idle" && this.state.lastType.type === "idle") {
            return;
        }

        // check if the current config.type is idle, if so check to see what the lastType.type was
        if (config.type === "idle" && this.state.lastType.type !== "idle") {
            config.type = this.state.lastType.type;
            config.map = this.state.lastType.map;
            usedSave = true;
        }

        // store state
        state = this.state[config.type];
        
        // store sprite map
        map = state[config.map];
        // find next sprite index
        nextIndex = state.current + 1;
        
        // if we are at the end of the sprite sequence, repeat from beginning
        if (nextIndex > state.sequence) {
            state.current = 0;
        } else if (usedSave) {
            state.current = 0;
        }
        // update the sx
        this.sx = map[state.current];
        state.current += 1;

        if (usedSave) {
            config.type = "idle";
            config.map = "map";
        }

        this.state.lastType = config;
        
        // check for some collisions
        this.checkCollisions();
    };

    /**
     * Handles Control from remote device (playstation 3 controller)
     * @method handleRemoteController
     * @overides Entity.js
     */
    Hero.prototype.handleRemoteController = function (e) {
        if (e.activeButtons['13']) {
            this.state.heading.s = 1;
        } else {
            this.state.heading.s = 0;
        }
        if (e.activeButtons['15']) {
            this.state.heading.e = 1;
        } else {
            this.state.heading.e = 0;
        }
        if (e.activeButtons['14']) {
            this.state.heading.w = 1;
        } else {
            this.state.heading.w = 0;
        }
        if (e.activeButtons['12']) {
            this.state.heading.n = 1;
        } else {
            this.state.heading.n = 0;
        }
    };

    Hero.prototype.collision = function (e) {
        this.isColliding = TRUE;
        this.handleCollision(e.against.type, e.aInfo);
    };

    Hero.prototype.handleCollision = function (collidedEntityType, collisionInfo) {
        var type = collidedEntityType,
            myHeading = this.state.heading;

        // if a entity is over another entity, move until it is no longer colliding
        if (!myHeading.n && !myHeading.e && !myHeading.s && !myHeading.w) {
            if (collisionInfo[0]) {
                this.y += this.speed;
            }
            if (collisionInfo[1]) {
                this.x += this.speed;
            }
            if (collisionInfo[2]) {
                this.y -= this.speed;
            }
            if (collisionInfo[3]) {
                this.x -= this.speed;
            }
        }

        if (myHeading.n) {
            this.mutators.direction[0] = 1;
            this.y += this.speed;
        } 

        if (myHeading.e) {
            this.mutators.direction[1] = 1;
            this.x -= this.speed;
        } 

        if (myHeading.s) {
            this.mutators.direction[2] = 1;
            this.y -= this.speed;
        } 

        if (myHeading.w) {
            this.mutators.direction[3] = 1;
            this.x += this.speed;
        } 

    };

    Hero.prototype.clearCollisions = function () {
        this.isColliding = FALSE;
        this.mutators.direction = [0,0,0,0];
    };

    window.Hero = Hero;
}());
