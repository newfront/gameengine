/* Sprite.js
 * sprites are objects with width, height, x, y and potential background images
*/
(function () {
    "use strict";
    var index = 0, 
        Sprite,
        NULL = null,
        TRUE = true,
        FALSE = false;

    Sprite = function (params) {
        if (!params) { params = {}; }

        this.x = params.x || 0;
        this.y = params.y || 0;
        this.originX = this.x;
        this.originY = this.y;
        // use this.type to tag a sprite as a specific type of entity / (eg: type: "enemy")
        this.type = params.type || "sprite";
        this.rotation = params.rotation || 0;
        this.collidesWith = params.collidesWith || [];
        this.sx = params.sx || 0;
        this.sy = params.sy || 0;
        this.collidable = params.collidable || FALSE;
        this.index = index; // don't mess with this since it handles the internal sprite stacking context (use swapDepths instead)
        this.width = params.width || 30;
        this.height = params.height || 30;
        this.image = params.image || null;
        this.color = params.color || "#000000";
        this.scaleX = params.scaleX || 1; // 2 = half
        this.scaleY = params.scaleY || 1; // 2 = half
        this.ready = FALSE;
        this.showBounds = params.showBounds || FALSE;
        this.boundsColor = params.boundsColor || "red";
        
        /* hit bounds */
        this.hitRect = params.hitRect || {
            enabled: FALSE,
            xOffset: 0,
            yOffset: 0,
            width: 0,
            height: 0
        };

        this.init();
        index += 1;
        return this;
    };

    Sprite.prototype.init = function (cb) {
        var image, self = this;
        if (this.image) {
            image = new Image();
            image.src = this.image;
            image.onload = function () {
                self.image = image;
                self.ready = true;
                // if we don't pass an image width and height...
                //image.naturalWidth
                //image.naturalHeight
                if (cb) {
                    cb.apply(null, [image]);
                }
            }
        }
    };

    Sprite.prototype.isColliding = FALSE;

    Sprite.prototype.checkCollisions = function () {
        var i = 0, 
            length, 
            item, 
            c_info,
            collisions = FALSE;

        length = this.collidesWith.items.length;
        for (; i < length; i++) {
            item = this.collidesWith.items[i];
            
            // my bounds vs collidables
            if (this.index !== item.index && item.collidable) {
                c_info = this.hitTest(this, item);
                if (c_info.hit) {
                    collisions = TRUE;
                    this.collision(c_info);
                    item.collision.apply(item, [{
                        hit: true,
                        against: this,
                        info: c_info.bInfo
                    }]);
                }
            }
        }
        if (!collisions) {
            // if we had collided, clear that state
            if (this.isColliding) {
                this.clearCollisions(); 
            }
        }
    };

    /**
     * Returns the boundries of the rectangle for this Sprite
     *
     * @method getBounds
     * @todo Add bounds for collision rect if requested
     */
    Sprite.prototype.getBounds = function () {
        var bounds = {};
        bounds.midpoint = [this.x + this.width/2, this.y + this.height/2];
        bounds.top = [[this.x,this.y],[bounds.midpoint[0], this.y],[this.x + this.width, this.y]]
        bounds.mid = [[this.x, bounds.midpoint[1]],[bounds.midpoint[0], bounds.midpoint[1]],[this.x + this.width, bounds.midpoint[1]]];
        bounds.bottom = [[this.x, this.y + this.height],[bounds.midpoint[0], this.y + this.height],[this.x + this.width, this.y + this.height]];
        return bounds;
    };

    Sprite.prototype.hitTest = function (rectA, rectB) {
        var collides = { 
            hit: false,
            against: rectB,
            /*
             aInfo[0] = above
             aInfo[1] = right
             aInfo[2] = below
             aInfo[3] = left
            */ 
            aInfo: [0,0,0,0],
            bInfo: [0,0,0,0]
        },
        rAX = rectA.x + rectA.hitRect.xOffset,
        rAY = rectA.y + rectA.hitRect.yOffset,
        rBX = rectB.x + rectB.hitRect.xOffset,
        rBY = rectB.y + rectB.hitRect.yOffset,
        // rectA height
        rAH = (rAY + rectA.height),
        // rectB height
        rBH = (rectB.y + rectB.height),
        // rectA width
        rAW = (rectA.x + rectA.width),
        // rectB width
        rBW = (rectB.x + rectB.width);

        if (rectA.hitRect.enabled) {
            rAW = rAX + (rectA.width + rectA.hitRect.width);
            rAH = rAY + (rectA.height + rectA.hitRect.height);
        }

        if (rectB.hitRect.enabled) {
            rBW = rBX + (rectB.width + rectB.hitRect.width);
            rBH = rBY + (rectB.height + rectB.hitRect.height);
        }

        if (rAX > rBX) {
            collides.aInfo[3] = 1;
            collides.bInfo[1] = 1;
        } else {
            collides.aInfo[1] = 1;
            collides.bInfo[3] = 1;
        }
        if (rAY > rBY) {
            collides.aInfo[2] = 1;
            collides.bInfo[0] = 1;
        } else {
            collides.aInfo[0] = 1;
            collides.bInfo[2] = 1;
        }

        // main geometric rect has rect algorithm
        // if the bounds of rectA are not in rectB we don't collide

        collides.hit = !(rAW <= rectB.x ||
            rBW < rAX ||
            rAH <= rBY ||
            rBH < rAY);

        return collides;
    };

    /**
     * When a Sprite is hit, this is the base method to handle collisions
     * Override
     *
     * @method collision
     * @type abstract_method
     */
    Sprite.prototype.collision = function (e) {
        this.isColliding = TRUE;
    };

    /**
     * If there are no collisions, then we remove that state from the Sprite
     *
     * @method clearCollisions
     */
    Sprite.prototype.clearCollisions = function () {
        this.isColliding = FALSE;
    };

    Sprite.prototype.scale = function (scaleX, scaleY) {
        this.scaleX = scaleX;
        this.scaleY = scaleY;
    };

    // we should probably take all states of a character, and then
    // pre-render those states, so we can fetch a copy of any state
    // from the backing store, and we don't have to cut the image
    Sprite.prototype.render = function (context) {
        if (typeof this.image !== "string" && this.ready) {
            context.save();
            /*context.translate(this.x, this.y);
            context.rotate(this.rotation);
            */
            context.scale(this.scaleX, this.scaleY);
            context.drawImage(
                this.image,
                this.sx,
                this.sy,
                this.width, 
                this.height, 
                this.x, 
                this.y, 
                this.width, 
                this.height
            );
            if (this.showBounds) {
                context.beginPath();
                context.rect(this.x+this.hitRect.xOffset, this.y+this.hitRect.yOffset, this.width+this.hitRect.width, this.height+this.hitRect.height);
                context.lineWidth = 1;
                context.strokeStyle = this.boundsColor;
                context.stroke();
            }
            context.restore();
        }
    };

    window.Sprite = Sprite;
}());
