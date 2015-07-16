/* Character.js
 * Used to spawn characters that do neat things
 * @extends sprite.js
 */

(function() {
	var Character = function (params) {
		var self = this;
		self.speed = params.speed || 6; // factor of 4 since it is divisible by 16 which is the default tile size
		self.direction = 0;
		Sprite.call(this, params);
		return self;
	},
	NULL = null,
	TRUE = true,
	FALSE = false,
	LEFT = 37,
	UP = 38,
	RIGHT = 39,
	DOWN = 40;

	// inherit from Sprite
	Character.prototype = new Sprite();

	// Character State Map
	Character.prototype.state = {
		current: "idle",
		default: "idle",
		walking: {
			sequence: 9,
			current: 0,
			padding: 4,
			delay: 1,
			left_offset: 0,
			right_offset: 636 / 2,
			/* cache states */
			map: {
				0: 0, // offset x for sprite sheet
				1: 72 / 2,
				2: 142 / 2,
				3: 212 / 2,
				4: 286 / 2,
				5: 356 / 2,
				6: 424 / 2,
				7: 494 / 2,
				8: 564 / 2
			}
		},
		idle: {},
		attacking: {},
		dying: {},
		/* keys are used for keys pressed (up, down, left, right) - via controller, remote socket, etc */
		keys: {
			left: 0, 
			right: 0,
			up: 0,
			down: 0
		},
		/* mutators affect the speed, and direction of the Character */
		mutators: {
			speed: NULL,
			direction: [NULL,NULL,NULL,NULL]
		}
	};

	// this.state.keys
	// 0,1, 2, 3
	Character.prototype.handleWalk = function () {

		this.handleMovement();
		
		// character has a sprite map of walking states
		// update these every tick
		if ((this.state.walking.current+1) < this.state.walking.sequence) {
			this.state.walking.current += 1;
		} else {
			this.state.walking.current = 0;
		}

		if (this.state.walking.map[this.state.walking.current]) {
			this.sx = Math.floor(this.state.walking.offset + this.state.walking.map[this.state.walking.current]);
		} else {
			this.sx = Math.floor(this.state.walking.offset + (this.state.walking.current * (this.width + this.state.walking.padding)));
		}
	};

	/**
	 * Handles Basic Character Movement based off of a state map
	 * give an object a state and it moves
	*/
	Character.prototype.handleMovement = function () {
		// direction (up,right,down,left = 0,1,2,3)
		if (this.state.keys.up) {
			this.y -= (this.state.mutators.direction[0] !== NULL) ? this.state.mutators.direction[0] : this.speed;
			this.state.walking.offset = this.state.walking.right_offset;
			this.sy = 100 / 2;
		}
		if (this.state.keys.down) {
			this.y += (this.state.mutators.direction[2] !== NULL) ? this.state.mutators.direction[2] :  this.speed;
			this.state.walking.offset = this.state.walking.left_offset;
			this.sy = 100 / 2;
		}
		if (this.state.keys.right) {
			this.x += (this.state.mutators.direction[1] !== NULL) ? this.state.mutators.direction[1] : this.speed;
			this.sy = 0;
			this.state.walking.offset = this.state.walking.right_offset;
		}
		if (this.state.keys.left) {
			this.x -= (this.state.mutators.direction[3] !== NULL) ? this.state.mutators.direction[3] : this.speed;
			this.sy = 0;
			this.state.walking.offset = this.state.walking.left_offset;
		}
	};

	Character.prototype.resetAnimation = function () {
		
		this.state[this.state.current].current = 0;
		if (this.state.keys.right) {
			this.sx = this.state.walking.right_offset;
		} else {
			this.sx = 0;
		}
		if (this.state.keys.up) {
			this.sy = 100 / 2;
			this.sx = this.state.walking.right_offset;
		}
		this.state.current = this.state.default;
	};

	Character.prototype.handleComplete = function (e) {
		switch (e.type) {
			case "keyup":
				this.resetAnimation();
				this.handleKeyUp(e);
				break;
		}
	};

	Character.prototype.handleKeyUp = function (e) {
		switch (e.keyCode) {
		case RIGHT:
			this.state.keys.right = 0;
			break;
		case LEFT:
			this.state.keys.left = 0;
			break;
		case DOWN:
			this.state.keys.down = 0;
			break;
		case UP:
			this.state.keys.up = 0;
			break;
		}
	};

	Character.prototype.handleKeypress = function (e) {
		switch(e.keyCode) {
			case RIGHT:
				this.state.keys.right = 1;
				this.handleWalk();
				this.checkCollisions();
				break;
			
			case DOWN:
				this.state.keys.down = 1;
				this.handleWalk();
				this.checkCollisions();
				break;
			
			case LEFT:
				this.state.keys.left = 1;
				this.handleWalk();
				this.checkCollisions();
				break;
			
			case UP:
				this.state.keys.up = 1;
				this.handleWalk();
				this.checkCollisions();
				break;
			
			case 65:
				console.log("attack"); // attack
				break;
			
			case 83:
				console.log("shield"); // sheild
				break;
		}
	};

	Character.prototype.handleRemoteController = function (e) {
		//console.log("Character Class is handling remote control");
		//console.log(e);
	};

	Character.prototype.collision = function (e) {
		this.isColliding = TRUE;
		/*console.log("Character just collided with an Object in 2D Linear Space");
		console.log(e);*/
		if (this.state.keys.up) {
			this.state.mutators.direction[0] = 0;
			this.y += 10;
		}
		if (this.state.keys.right) {
			this.state.mutators.direction[1] = 0;
			this.x -= 10;
			//console.log("collision to the right of Character");
		}
		if (this.state.keys.down) {
			this.state.mutators.direction[2] = 0;
			this.y -= 10;
			//console.log("collision below the Character");
		}
		if (this.state.keys.left) {
			this.state.mutators.direction[3] = 0;
			this.x += 10;
			//console.log("collision to the left of the Character");
		}
	};

	Character.prototype.clearCollisions = function (e) {
		this.isColliding = FALSE;
		//console.log("CLEAR COLLISIONS");
		// unset the directional mutators
		this.state.mutators.direction[0] = NULL;
		this.state.mutators.direction[1] = NULL;
		this.state.mutators.direction[2] = NULL;
		this.state.mutators.direction[3] = NULL;
	};

	window.Character = Character;
}());