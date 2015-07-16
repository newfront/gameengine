(function() {

	var NULL = null,
		TRUE = true,
		FALSE = false,

		Entity = function (params) {
			var self = this;
			self.speed = params.speed || 4; // factor of 4 since it is divisible by 16 which is the default tile size
			self.direction = 0;
			Sprite.call(this, params);
            self.dirty = false;
			return self;
		};

	// inherit from Sprite
	Entity.prototype = new Sprite();

    // should be capable of having many states
    Entity.prototype.state = {
        current: "",
        heading: {n:0,e:0,s:0,w:0}
    };

    // entity should be able to be affected by its surrounding
    // eg: entity is in water, in mud (slow), on ice slick = fast, blocked at wall
    Entity.prototype.mutators = {
        speed: NULL,
        direction: [0,0,0,0]
    };

    Entity.prototype.clearMovement = function () {
        this.state.heading.n = 0;
        this.state.heading.e = 0;
        this.state.heading.s = 0;
        this.state.heading.w = 0;
    };

    /**
     * Entity should be able to be controlled via 3rd party - eg. websocket, usb controller, via SimpleAI
     *
     * @method handleRemoteController
     * @type Dynamic
     */
    Entity.prototype.handleRemoteController = function (e) {
    };

    /**
     * Entity should be able to be controlled via keyboard input
     * @method handleKeypress
     * @dynamic
     */
    Entity.prototype.handleKeypress = function (e) {
        var code = e.keyCode.toString();
        // e.keyCode is the keyCode for the keyboard
        // 39 is right
        // 40 is down
        // 37 is left
        // 38 is up
        switch (code) {
        case "39":
            this.state.heading.e = 1;
            this.dirty = true;
            break;
        case "40":
            this.state.heading.s = 1;
            this.dirty = true;
            break;
        case "37":
            this.state.heading.w = 1;
            this.dirty = true;
            break;
        case "38":
            this.state.heading.n = 1;
            this.dirty = true;
            break;
        }
    };

    /**
     * Unset the direction of movement when the key is deactivated
     * @method handleKeyUp
     * @dynamic
     */
    Entity.prototype.handleKeyUp = function (e) {
        var code = e.keyCode.toString();
        switch (code) {
        case "39":
            this.state.heading.e = 0;
            this.dirty = true;
            break;
        case "40":
            this.state.heading.s = 0;
            this.dirty = true;
            break;
        case "37":
            this.state.heading.w = 0;
            this.dirty = true;
            break;
        case "38":
            this.state.heading.n = 0;
            this.dirty = true;
            break;
        }
    };

    /**
     * Entity should be able to react to collisions - eg. the character, enemy etc was hit (now what?)
     *
     * @method respondToCollision
     */
    Entity.prototype.respondToCollision = function (e) {

    };

    /**
     * Entity should be able to be hit, bumped, etc by other entities
     *
     * @method collision
     * @param {Event} e Is the collision event (has properties hit, and with - with means you hit X object)
     */
    Entity.prototype.collision = function (e) {
    };

    /**
     * Entity should be able to clear out collision states
     *
     * @method clearCollisions
     */
    Entity.prototype.clearCollisions = function (e) {
        this.isColliding = FALSE;
        // unset the directional mutators
        this.mutators.direction = [0,0,0,0];
    };

    window.Entity = Entity;
}());
