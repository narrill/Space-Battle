/*
loader.js
variable 'app' is in global scope - i.e. a property of window.
app is our single global object literal - all other functions and properties of 
the game will be properties of app.
*/
"use strict";

// if app exists use the existing copy
// else create a new empty object literal
var app = app || {};


window.onload = function(){
	console.log("window.onload called");
	createjs.Sound.initializeDefaultPlugins();
	var audioPath = 'sounds/';
	var sounds = [
		{id:"laser",src:"pew.mp3"}
	];
	app.main.sounds = {
		loaded:false,
		laser:'laser',
		thruster:'thruster'
	};
	createjs.Sound.alternateExtensions = ["mp3"];
	createjs.Sound.addEventListener("fileload",handleLoad);
	createjs.Sound.registerSounds(sounds,audioPath);
	app.main.init();
	pointerInit();
}

function handleLoad(event){
	createjs.Sound.play(event.src);
	app.main.sounds.loaded = true;
}

window.onblur = function(){
	myKeys.keydown = [];
	app.main.pauseGame();
};
window.onfocus = function(){
	app.main.resumeGame();
};