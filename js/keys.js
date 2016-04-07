// The myKeys object will be in the global scope - it makes this script 
// really easy to reuse between projects

"use strict";

var myKeys = {};

myKeys.KEYBOARD = Object.freeze({
	"KEY_LEFT": 37, 
	"KEY_UP": 38, 
	"KEY_RIGHT": 39, 
	"KEY_DOWN": 40,
	"KEY_SPACE": 32,
	"KEY_SHIFT": 16,
	"KEY_W":87,
	"KEY_A":65,
	"KEY_D":68,
	"KEY_S":83,
	"KEY_Q":81,
	"KEY_E":69,
	"KEY_TAB":9,
	"KEY_F":70,
	"KEY_R":82
});

// myKeys.keydown array to keep track of which keys are down
// this is called a "key daemon"
// main.js will "poll" this array every frame
// this works because JS has "sparse arrays" - not every language does
myKeys.keydown = [];

/*window.addEventListener("keydown", function(e) {
    // space and arrow keys
    if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);*/

// event listeners
window.addEventListener("keydown",function(e){
	//console.log("keydown=" + e.keyCode);
	myKeys.keydown[e.keyCode] = true;
	e.preventDefault();

	// space and arrow keys
    /*if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }*/
});
	
window.addEventListener("keyup",function(e){
	//console.log("keyup=" + e.keyCode);
	myKeys.keydown[e.keyCode] = false;
	
	// pausing and resuming
	if(e.keyCode == myKeys.KEYBOARD.KEY_TAB)
		app.main.ship.stabilizersEnabled = !app.main.ship.stabilizersEnabled;
	else if(e.keyCode == myKeys.KEYBOARD.KEY_F)
		app.main.drawStarField = !app.main.drawStarField;
});