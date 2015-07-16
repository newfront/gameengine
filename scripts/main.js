/* main.js */
var Engine = {
    TileMaps: {},
    Level: {},
    Viewport: {}
}, game, hero, hero2, treeHit, treeHit2, background;

require(['helpers/gamepad','config/areas/field_area_main', 'config/areas/field_area_large', 'engine/tiled_map','engine/display_list','engine/game','engine/sprite','engine/entity', 'engine/character', 'characters/hero'], function () {
    
    game = new Game({
        width: 600,
        height: 400,
        area: {
            current: "fieldAreaNew",
            x: 200, // allows you to set offset in tilemap
            y: 100 // allows you to set offset in tilemap
        },
        controllers: [{
            type: "gamepad",
            context: new Utils.GamePad(),
            method: "init"
        }]
    });
    game.init(); // create canvas, get contexts

    // need to be able to plugin gamepad api if available
    // need to make game listen to controllers as well
    game.addListener(document, "keydown");
    game.addListener(document, "keyup");

    // if we have a gamepad attached
    if (game.remotes.gamepad && game.remotes.gamepad.supported) {
        // bind the game's handleRemote method to the gamepad observer
        game.remotes.gamepad.registerObserver({
            id: "engine",
            type: "buttonPressed",
            method: game.handleRemote.bind(game)
        });
    }
    
    /*treeHit = new Sprite({
        x: 21,
        y: 51,
        width: 16,
        height: 16,
        collidable: true,
        showBounds: true,
        boundsColor: "red",
        image: 'images/sprites/misc/clear.gif',
        hitRect: {
            enabled: true,
            height: 40,
            width: 40,
            xOffset: 0,
            yOffset: 0
        },
        sx: 32
    });
    
    
    treeHit2 = new Sprite({
        type: "enemy",
        x: 163,
        y: 44,
        width: 16,
        height: 16,
        collidable: true,
        showBounds: false,
        boundsColor: "black",
        image: 'images/sprites/misc/clear.gif',
        hitRect: {
            enabled: true,
            height: 30,
            width: 100,
            xOffset: 0,
            yOffset: -7
        },
        sx: 32
    });

    game.displayList.add(treeHit);
    game.displayList.add(treeHit2);
    */

    game.renderBackground();

    hero = new Hero({
        type: "hero",
        image: 'images/sprites/link/walking_all.png',
        height: 50,
        width: 34,
        x: 100,
        y: 100,
        showBounds: false,
        boundsColor: "red",
        collidable: true,
        collidesWith: game.displayList,
        hitRect: {
            enabled: true,
            xOffset: 3,
            yOffset: 7,
            width: -7,
            height: -10
        },
        speed: 4,
        scaleY: 1,
        scaleX: 1,
        cameraTrack: true
    });

    game.addObserver(hero, "keydown", "handleKeypress");
    game.addObserver(hero, "keyup", "handleKeyUp");
    game.trackEntity(hero);
    /*game.addObserver(hero2, "buttonsPressed", "handleRemoteController");*/
    
    // displayList is the foreground
    game.displayList.add(hero);
    //game.displayList.add(hero2);

    // note: if you want link to be able to run behind an object, it can't be in the background layer
    // in general it is better for performance if you paint the background seldomly, and only update the main canvas
    // you have 3 canvas's to composite if you want (game.ui.canvas, game.ui.buffer, game.ui.background)
    // buffer will probably be renamed to something else since compositing is working nicely without the need for a real double buffer

    game.render();

});
