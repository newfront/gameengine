/**
 * Support for the experimental GamePad API (chrome > 20 and some Firefox)
 * http://www.html5rocks.com/en/tutorials/doodles/gamepad/
 */
var Utils = Utils || {};

var GamePad = function (params) {
    var self = this;
    self.enabled = true;
    self.supported = false;
    self.api = null;
    self.gamepads = {}; // store controllers by their vendor id (ex: PLAYSTATION(R)3 Controller (STANDARD GAMEPAD Vendor: 054c Product: 0268))
    self.polling = false;
    self.observers = [];
    return this;
}

GamePad.prototype = {
    /**
     * start method for the GamePad API
     *
     * @method init
     */
    init: function () {
        this.api = this.getApi();
        if (this.api) {
            this.supported = true;
            this.startPolling();
        }
    },

    registerObserver: function (params) {
        var i, length, isListening=false;

        length = this.observers.length;

        for (i=0; i < length; i++) {
            if (this.observers[i].id === params.id) {
                isListening = true;
                // someone is already listening
                return;
            }
        }
        this.observers.push({
            id: params.id,
            type: params.type,
            method: params.method
        });
    },

    // unregisterObserver : can be finished later as we have no reason to bind and unbind observers (in testing phase)

    /**
     * Need to dispatch a controller event to a subscribed character
     *
     * @method controllerEvent
     */
    controllerEvent: function (type, params) {
        var i, 
            length = this.observers.length,
            observer;

        params.type = type;

        for (i=0; i < length; i++) {
            observer = this.observers[i];
            if (observer.hasOwnProperty("method")) {
                // send the observer the controller event and params
                this.observers[i].method.apply(null, [params]);
            }
        }
    },
    /**
     * get the browser gamepad API handle
     *
     * @method getApi
     * @return API Handle or null
     */
	getApi: function () {
		var api;

		if (!!navigator.webkitGetGamepads) {
        	return "webkitGetGamepads";
        }

        if (!!navigator.webkitGamepads) {
            return "webkitGamepads";
        }
        return;
	},

    /**
     * Gamepad API requires that you Poll for the connected controllers
     *
     * @method startPolling
     */
    startPolling: function () {
        if (!this.enabled || this.polling) { 
            return; 
        }

        this.polling = true;
        this.tick(); // tick tock
    },

    stopPolling: function () {
        this.polling = false;    
    },

    tick: function () {
        if (this.polling) {
            this.pollStatus();
        }
        this.scheduleNextTick();
    },

    scheduleNextTick: function () {
        window.requestAnimationFrame(this.tick.bind(this));
    },

    pollStatus: function () {

        var gamepads = navigator[this.api](),
            length, i;

        // stop hammering on this method until we have captured the controller data
        this.polling = false;

        length = gamepads.length;
        for (i=0; i < length; i++) {
            if (gamepads[i] !== undefined) {
                this.fetchControllerData(gamepads[i]);
            }
        }

        // open the method up again
        this.polling = true;
    },

    fetchControllerData: function (controller) {

        var gamepad_controller;
        
        if (!this.gamepads.hasOwnProperty(controller.id)) {
            this.gamepads[controller.id] = {
                controller: controller,
                activeButtons: {},
                active: false
            }
        }

        gamepad_controller = this.gamepads[controller.id];

        function checkButtons() {
            var i, length, 
                buttons = controller.buttons,
                changed = false;
            
            length = buttons.length;

            for (i=0; i < length; i++) {
                if (buttons[i] !== 0) {
                    //console.log("button #"+i+" pressed: Data - " + buttons[i]);
                    gamepad_controller.activeButtons[i] = 1;
                    changed = true;
                } else {
                    if (gamepad_controller.activeButtons.hasOwnProperty(i)) {
                        delete gamepad_controller.activeButtons[i]; // see how this performs as deleting from the prototype can be expensive
                    } 
                }
            }
            if (changed) {
                gamepad_controller.active = true;
            } else if (gamepad_controller.active) {
                gamepad_controller.active = false;
                changed = true;
            }

            return changed;
        }

        // check the buttons for pressed states
        if (checkButtons()) {
            this.controllerEvent("buttonsPressed", gamepad_controller);
        }

    }
};

Utils.GamePad = GamePad;