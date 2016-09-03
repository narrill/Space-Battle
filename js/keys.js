// The myKeys object will be in the global scope - it makes this script 
// really easy to reuse between projects

"use strict";
var canvas;
var locked = false;
function pointerInit(c){
	canvas = c;
	canvas.addEventListener("mouseup",requestLock);
	// Hook pointer lock state change events
	document.addEventListener('pointerlockchange', changeCallback, false);
	document.addEventListener('mozpointerlockchange', changeCallback, false);
	document.addEventListener('webkitpointerlockchange', changeCallback, false);
	/*var havePointerLock = 'pointerLockElement' in document ||
		'mozPointerLockElement' in document ||
		'webkitPointerLockElement' in document;*/
	canvas.requestPointerLock = canvas.requestPointerLock ||
		canvas.mozRequestPointerLock ||
		canvas.webkitRequestPointerLock;
	//canvas.onclick = requestLock;
	//canvas.onmousedown = 
}

var myKeys = {};

myKeys.KEYBOARD = Object.freeze({
	"KEY_LEFT": 37, 
	"KEY_UP": 38, 
	"KEY_RIGHT": 39, 
	"KEY_DOWN": 40,
	"KEY_SPACE": 32,
	"KEY_SHIFT": 16,
	"KEY_ALT":18,
	"KEY_W":87,
	"KEY_A":65,
	"KEY_D":68,
	"KEY_S":83,
	"KEY_Q":81,
	"KEY_E":69,
	"KEY_TAB":9,
	"KEY_F":70,
	"KEY_R":82,
	"KEY_C":67,
	"KEY_P":80,
	"KEY_CTRL":17,
	KEY_J:74,
	KEY_K:75,
	KEY_L:76,
	KEY_ENTER:13
});

var myMouse = {};

myMouse.BUTTONS = Object.freeze({
	LEFT:0,
	MIDDLE:1,
	RIGHT:2
});

myMouse.mousedown = [];
myMouse.direction = 0;
myMouse.wheel = 0;
myMouse.sensitivity = .1;
// myKeys.keydown array to keep track of which keys are down
// this is called a "key daemon"
// main.js will "poll" this array every frame
// this works because JS has "sparse arrays" - not every language does
myKeys.keydown = [];

// event listeners
window.addEventListener("keydown",function(e){
	//console.log("keydown=" + e.keyCode);
	if(state==GAME_STATES.CHOOSESHIP){
		if(e.keyCode == 8 && entry.length>0)
			entry = entry.slice(0,-1);
		else if(e.keyCode!=13) entry+=String.fromCharCode(e.keyCode);
	}
	myKeys.keydown[e.keyCode] = true;
	socket.send({keyCode:e.keyCode,pos:1});
	e.preventDefault();
	e.stopPropagation();

	// space and arrow keys
    /*if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }*/
});
	
window.addEventListener("keyup",function(e){
	//console.log("keyup=" + e.keyCode);
	
	myKeys.keydown[e.keyCode] = false;
	socket.send({keyCode:e.keyCode,pos:0});
	e.preventDefault();
	e.stopPropagation();
	
	// pausing and resuming
	/*if(e.keyCode == myKeys.KEYBOARD.KEY_TAB && !myKeys.keydown[myKeys.KEYBOARD.KEY_ALT])
		app.game.ship.stabilizer.enabled = !app.game.ship.stabilizer.enabled;
	else if(e.keyCode == myKeys.KEYBOARD.KEY_C)
		app.game.ship.stabilizer.clamps.enabled = !app.game.ship.stabilizer.clamps.enabled;
	else if(e.keyCode == myKeys.KEYBOARD.KEY_F)
		app.game.drawStarField = !app.game.drawStarField;
	else if (e.keyCode == myKeys.KEYBOARD.KEY_P)
	{
		//app.game.paused = !app.game.paused;
		if(app.game.paused) gameFunctions.resumeGame(app.game);
		else gameFunctions.pauseGame(app.game);
	}*/
	//else if(e.keyCode == myKeys.KEYBOARD.KEY_E)
	//	app.game.ship.weaponToggle = !app.game.ship.weaponToggle;
});

function requestLock(){
	console.log('request');
	// Ask the browser to lock the pointer
	canvas.requestPointerLock();
}

function mouseDown(e){
	//console.log(e.button);
	//myMouse.mousedown[e.button] = true;
	//socket.send({mouseLeft})
	socket.send({mb:e.button,pos:1});
}

function mouseUp(e){
	//console.log('up');
	//myMouse.mousedown[e.button] = false;
	socket.send({mb:e.button,pos:0});
}

function mouseWheel(e){
	myMouse.wheel += e.wheelDelta;
}

function changeCallback(){
	if (document.pointerLockElement === canvas ||
		document.mozPointerLockElement === canvas ||
		document.webkitPointerLockElement === canvas) {
		// Pointer was just locked
		// Enable the mousemove listener
		window.removeEventListener("mouseup",requestLock,false);
		window.addEventListener("mousedown",mouseDown,false);
		window.addEventListener("mouseup",mouseUp,false);
		window.addEventListener("mousewheel",mouseWheel,false);
		document.addEventListener("mousemove", moveCallback, false);
		canvas.onclick = undefined;
		locked = true;
	} else {
		// Pointer was just unlocked
		// Disable the mousemove listener
		window.removeEventListener("mousedown",mouseDown,false);
		window.removeEventListener("mouseup",mouseUp,false);
		window.removeEventListener("mousewheel",mouseWheel,false);
		canvas.addEventListener("mouseup",requestLock,false);
		document.removeEventListener("mousemove", moveCallback, false);
		//this.unlockHook(this.canvas);
		canvas.onclick = function(){
			// Ask the browser to lock the pointer
			canvas.requestPointerLock();
		};
		locked = false;
	}
}
function moveCallback(e){
	//console.log('move');
	var movementX = e.movementX ||
		e.mozMovementX          ||
		0;

  	var movementY = e.movementY ||
		e.mozMovementY      ||
		0;
		myMouse.direction += movementX;
}
function resetMouse(){
	myMouse.wheel = 0;
	myMouse.direction = 0;
}
function resetWheel(){
	myMouse.wheel = 0;
}

function resetDirection(){
	myMouse.direction = 0;
}