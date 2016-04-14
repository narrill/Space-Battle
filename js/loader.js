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
		{id:"laser",src:"laser.mp3"},
		{id:"bgm",src:"space rudder.mp3"}
		//{id:"thruster",src:"thruster.mp3"}
	];
	var thrusterSound = [{id:"thruster",src:"thruster.mp3"}];
	app.main.sounds = {
		laser:{id:'laser',loaded:false},
		thruster:{id:'thruster',loaded:false},
		bgm:{id:'bgm',loaded:false}
	};
	createjs.Sound.alternateExtensions = ["mp3"];
	createjs.Sound.addEventListener("fileload",handleLoad);
	createjs.Sound.registerSounds(sounds,audioPath,1);
	createjs.Sound.registerSounds(thrusterSound,audioPath,1);
	app.main.init();
	pointerInit();
}

function handleLoad(event){
	if(event.id==app.main.sounds.bgm.id)
		createjs.Sound.play(event.src,{loop:-1});
	else if(event.id==app.main.sounds.thruster.id)
	{
		app.main.thrusterSound = createjs.Sound.play(event.src,{loop:-1});
		app.main.thrusterSound.volume = 0;
	}
	app.main.sounds[event.id].loaded = true;
}

window.onblur = function(){
	myKeys.keydown = [];
	app.main.pauseGame();
	if(app.main.thrusterSound)
		app.main.thrusterSound.volume = 0;
};
window.onfocus = function(){
	app.main.resumeGame();
};