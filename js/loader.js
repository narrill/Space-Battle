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
		{id:"bgm",src:"space rudder.mp3"},
		{id:"thruster",src:"thruster.mp3"},
		{id:"gunshot1",src:"gunshot1.mp3"},
		{id:"gunshot2",src:"gunshot2.mp3"},
		{id:"gunshot3",src:"gunshot3.mp3"},
		{id:"gunshot4",src:"gunshot4.mp3"}
	];
	//var thrusterSound = [{id:"thruster",src:"thruster.mp3"}];
	app.game.sounds = {
		laser:{id:'laser',loaded:false},
		thruster:{id:'thruster',loaded:false},
		bgm:{id:'bgm',loaded:false},
		gunshot1:{id:'gunshot1',loaded:false},
		gunshot2:{id:'gunshot2',loaded:false},
		gunshot3:{id:'gunshot3',loaded:false},
		gunshot4:{id:'gunshot4',loaded:false}
	};
	createjs.Sound.alternateExtensions = ["mp3"];
	createjs.Sound.addEventListener("fileload",handleLoad);
	createjs.Sound.registerSounds(sounds,audioPath,100);
	//createjs.Sound.registerSounds(thrusterSound,audioPath,1);
	gameFunctions.init(app.game);
	startClient(app.game);
	pointerInit();
	window.addEventListener('resize',function(e){
		var can = document.querySelector('#canvas1');
		can.width = window.innerWidth;
        can.height = window.innerHeight;
	});
}

function handleLoad(event){
	if(event.id==app.game.sounds.bgm.id)
		createjs.Sound.play(event.src,{loop:-1});
	else if(event.id==app.game.sounds.thruster.id)
	{
		app.game.thrusterSound = createjs.Sound.play(event.src,{loop:-1});
		app.game.thrusterSound.volume = 0;
	}
	app.game.sounds[event.id].loaded = true;
}

window.onblur = function(){
	myKeys.keydown = [];
	gameFunctions.pauseGame(app.game);
	//if(app.game.thrusterSound)
	//	app.game.thrusterSound.volume = 0;
};
window.onfocus = function(){
	gameFunctions.resumeGame(app.game);
};