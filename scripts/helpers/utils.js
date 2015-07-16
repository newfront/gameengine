// rAF polyfill
if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            return window.setTimeout(callback, 1000/60);
        }
    );
}

var utils = {
    min_swipe_dist: 20,
    min_tap_dist: 10,
    prevent_default_after: 5
};

/**
 * Color Parsing
 */
utils.parseColor = function (color, toNumber) {
    if (toNumber === true) {
        if (typeof color === 'number') {
            return (color | 0); // chop off decimal
        }
        if (typeof color === 'string' && color[0] === '#') {
            color = color.slice(1);
        }
        return window.parseInt(color, 16);
    } else {
        if (typeof color === 'number') {
            // make sure our hexidecimal number is padded out
            color = '#' + ('00000' + (color | 0).toString(16)).substr(-6);
        }
        return color;
    }
};

utils.captureKeyboard = function (element) {
    var key = {
        current: ''
    }, keyMap = {
            39: "right",
            40: "down",
            37: "left",
            38: "up"
        };

    element.addEventListener("keydown", function (e) {
        key.current = keyMap[e.keyCode];
    }, false);

    return key;
};

utils.captureMouse = function (element) {
	var mouse = {
		x: 0,
		y: 0
	};

	element.addEventListener("mousemove", function (e) {
		var x,y;
		if (e.pageX || e.pageY) {
			x = e.pageX;
			y = e.pageY;
		} else {
			x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
			y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		}
		x -= element.offsetLeft;
		y -= element.offsetTop;

		mouse.x = x;
		mouse.y = y;
	}, false);

	return mouse;
};
/**
 * Create a new tap event
 * 
 * @param {DOMNode} target Is the element you have registered to listen to this event
 * @param {Object} params Is the object to pass through the event
 */
utils.dispatchTap = function (target,params) {
    var evt;
    if (!params) {params = {};}
    evt = document.createEvent("CustomEvent");
    evt.initCustomEvent('tap', true, true, params);
    target.dispatchEvent(evt);
};

/**
 * Create a new swipe event
 *
 * @param {DOMNode} target Is the element you have registered to listen to this event
 * @param {Object} params Is the object to pass through the event
 */
utils.dispatchSwipe = function (target, type, params) {
    var evt;
    if (!params) {params = {};}
    if (!type) {type = "swipe";}
    evt = document.createEvent("CustomEvent");
    evt.initCustomEvent(type, true, true, params);
    target.dispatchEvent(evt);
};

utils.dispatchSlide = function (target, type, params) {
    var evt;
    if (!params) { params = {};}
    if (!type) {type = "slide";}
    evt = document.createEvent("CustomEvent");
    evt.initCustomEvent(type, true, true, params);

    target.dispatchEvent(evt);
};

utils.captureTouch = function (element) {
	var touch = {
		x: null,
		y: null,
        x_orig: null,
        y_orig: null,
        delta: {
            x: 0,
            y: 0
        },
        movement: {
            x: 0,
            y: 0
        }
	};

    function invalidate_swipe(direction,absx,absy) {
        var fuzzy_range = 100;

        if (direction === "x") {
            if (absy < fuzzy_range) {
                return false;
            }
        } else {
            if (absx < fuzzy_range) {
                return false;
            }
        }
        // fail through
        return true;
    };

    /**
     * Is this a tap?
     */
    function isTap(e) {
        var absx, absy, evt, dx, dy, params, 
            dispatch = false;

        if (!touch.x || !touch.y) {
            utils.dispatchTap(element, {
                x: touch.x_orig,
                y: touch.y_orig
            });
        } else {
            dx = touch.x_orig - touch.x;
            dy = touch.y_orig - touch.y;
            absx = Math.abs(dx);
            absy = Math.abs(dy);
            if (absx < utils.min_tap_dist && absy < utils.min_tap_dist) {
                utils.dispatchTap(element, {
                    x: touch.x,
                    y: touch.y,
                    base: e
                });
            } else {
                params = {
                    x: touch.x,
                    y: touch.y,
                    dx: dx,
                    dy: dy,
                    direction: null,
                    axis: null,
                    base: e
                };
                if (absx > utils.min_swipe_dist && absy < absx) {
                    // swipe event on x axis
                    params.direction = (dx > 0) ? 'left' : 'right';
                    params.axis = 'x';
                    if (!invalidate_swipe('x',absx,absy)) {
                        dispatch = true;
                    }
                } else if (absy > utils.min_swipe_dist && absy > absx) {
                    params.direction = (dy > 0) ? 'up' : 'down';
                    params.axis = 'y';
                    if (!invalidate_swipe('y',absx,absy)) {
                        dispatch = true;
                    }
                }

                if (dispatch) {
                    utils.dispatchSwipe(element, "swipe", params);
                }
            }
        }
        return false;
    };

    /**
     * Get the x and y coords of the touch
     */
    function getXY(te) {
        var t = {x: null,y: null};

        if (te.pageX || te.pageY) {
            t.x = te.pageX;
            t.y = te.pageY;
        } else {
            t.x = te.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            t.y = te.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }
        t.x -= element.offsetLeft;
        t.y -= element.offsetTop;

        return t;
    };

    /**
     * Helper method for preventing default
     */
    function shouldPreventDefault(e) {
        var absx, absy, 
            dx = touch.x_orig - touch.x, 
            dy = touch.y_orig - touch.y;
        
        absx = Math.abs(dx);
        absy = Math.abs(dy);

        if (absx >= utils.prevent_default_after || absy >= utils.prevent_default_after) {
            e.preventDefault();
        }
    };

	// add interal touchstart listener
	element.addEventListener("touchstart", function (e) {
        var touch_event = event.touches[0],
            pos;

        pos = getXY(touch_event);
        touch.x_orig = pos.x;
        touch.y_orig = pos.y;
        touch.delta.x = 0;
        touch.delta.y = 0;
        touch.movement.x = 0;
        touch.movement.y = 0;

        e.preventDefault();

	}, false);

    // add internal touchend listener
    element.addEventListener("touchend", function (e) {
        var tap = isTap(e);
        touch.x = null;
        touch.y = null;
        touch.x_orig = null;
        touch.y_orig = null;
    }, false);

	// add internal touchmove listener
	element.addEventListener("touchmove", function (e) {
        var pos, 
            touch_event = event.touches[0];
        pos = getXY(touch_event);

        touch.x = pos.x;
        touch.y = pos.y;
        touch.movement.x += touch.x;
        touch.movement.y += touch.y;
        touch.delta.x = touch.x_orig - touch.x;
        touch.delta.y = touch.y_orig - touch.y;

        shouldPreventDefault(e);

        utils.dispatchSlide(element, "slide", {
            delta: touch.delta,
            movement: touch.movement
        });

	}, false);


    return touch;
	
};