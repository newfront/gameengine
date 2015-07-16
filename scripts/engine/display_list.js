/* Display List */
(function () {
    var DisplayList = function () {
    	var self = this;
    	self.index = 0;
    	self.lastIndex = 0;
    	self.items = [];
    	self.map = {};
    	self.reverse_map = {};
    	return self;
    }

    DisplayList.prototype = {
    	// add a sprite to the display list
    	add: function (sprite) {
            var index = this.index;
            this.items.push(sprite);
            this.map[index] = sprite;
            this.reverse_map[sprite.index] = index;
            this.index += 1;
            return true;
        },
        
        // remove a Sprite from the display list
        remove: function (sprite) {
        	var index = this.reverse_map[sprite.index]
            if (this.map.hasOwnProperty(index)) {
                this.items.splice(index,1); // remove the item from displayList
                delete this.map[index]; // remove from the displayList map
                delete this.reverse_map[sprite.index];
            }
        },
        
        // find the depth of a current Sprite
        getDepth: function (sprite) {
        	return this.reverse_map[sprite.index];
        },
    
        // switch item positions in the display stack
        swapDepths: function (sp1,sp2) {
        	if (!sp1 || !sp2) { return; }
        	var aD = this.getDepth(sp1), // original index
        		bD = this.getDepth(sp2); // original index
    
        	this.items[aD] = sp2;
        	this.items[bD] = sp1;
    
        	this.map[aD] = sp2;
        	this.map[bD] = sp1;
    
        	this.reverse_map[sp1.index] = bD;
        	this.reverse_map[sp2.index] = aD;
        }
    };

    window.DisplayList = DisplayList;
}());