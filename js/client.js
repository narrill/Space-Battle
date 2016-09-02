'use strict'
var animationID = 0;
var game = undefined;
var lastTime = 0;
var cameras = {};
var accumulator = 0;
var socket;
var playerInfo = {x:0,y:0, rotation:0,velX:0,velY:0,rotationalVelocity:0};
var hudInfo = {};
var state;
var GAME_STATES = {
	TITLE:0,
	PLAYING:1,
	WIN:2,
	LOSE:3,
	MENU:4,
	TUTORIAL:5
};

function startClient(){
	//game = g;
	var canvas = document.querySelector('#canvas1');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	cameras.camera = constructors.createCamera(canvas,{x:0,y:0,rotation:0,zoom:.5,minZoom:.025,maxZoom:5});
	cameras.camera.globalCompositeOperation = 'hard-light';
	cameras.starCamera = constructors.createCamera(canvas);
	cameras.gridCamera = constructors.createCamera(canvas);
	cameras.minimapCamera = constructors.createCamera(canvas,{zoom:.001,viewport:{startX:.83,startY:.7,endX:1,endY:1,parent:cameras.camera}});
	lastTime = Date.now().valueOf();
	socket = new FalseSocket(server);
	socket.onmessage = messageHandler;	
	
	pointerInit(canvas);
	state = GAME_STATES.TITLE;
	animationID = requestAnimationFrame(frame);
}

function frame(){
	animationID = requestAnimationFrame(frame);
	var now = Date.now().valueOf();
	var dt = (now-lastTime)/1000;

	lastTime = Date.now().valueOf();
	drawing.draw.bind(game)(cameras,game,dt);

	var step = (game)?game.timeStep:.004;
	if(dt>step*4)
	{
			dt = step;
			console.log('throttle');
	}
	accumulator+=dt;
	while(accumulator>=step){
		update(game,step);
		accumulator-= step;
	}	
}

function update(game, dt){
	if(state == GAME_STATES.TITLE && myKeys.keydown[myKeys.KEYBOARD.KEY_ENTER])
	{
		state = GAME_STATES.WAIT;
		myKeys.keydown[myKeys.KEYBOARD.KEY_ENTER] = false;
		socket.send({gameId:'mainGame',ship:'cheetah'});
		//game.resetGame();
	}
	else if(state == GAME_STATES.PLAYING)
	{
	//camera shenanigans
	//camera zoom controls
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_UP] && cameras.camera.zoom<=cameras.camera.maxZoom)
			cameras.camera.zoom*=1+(1.05-1)*dt;
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_DOWN] && cameras.camera.zoom>=cameras.camera.minZoom)
			cameras.camera.zoom*=1+(.95-1)*dt;
		if(myMouse.wheel)
			cameras.camera.zoom*=1+(myMouse.wheel/500);
		if(cameras.camera.zoom>cameras.camera.maxZoom)
			cameras.camera.zoom = cameras.camera.maxZoom;
		else if(cameras.camera.zoom<cameras.camera.minZoom)
			cameras.camera.zoom = cameras.camera.minZoom;

		cameras.camera.x = lerp(cameras.camera.x,playerInfo.x+playerInfo.velX/10,12*dt);// game.ship.forwardVectorX*(cameras.camera.height/6)*(1/cameras.camera.zoom);
		cameras.camera.y = lerp(cameras.camera.y,playerInfo.y+playerInfo.velY/10,12*dt);// game.ship.forwardVectorY*(cameras.camera.height/6)*(1/cameras.camera.zoom);
		var rotDiff = playerInfo.rotation+playerInfo.rotationalVelocity/10 - cameras.camera.rotation;
		if(rotDiff>180)
			rotDiff-=360;
		else if(rotDiff<-180)
			rotDiff+=360;
		cameras.camera.rotation += lerp(0,rotDiff,12*dt);
		if(cameras.camera.rotation>180)
			cameras.camera.rotation-=360;
		else if(cameras.camera.rotation<-180)
			cameras.camera.rotation+=360;
		cameras.starCamera.x = cameras.camera.x;
	 	cameras.starCamera.y = cameras.camera.y;
	 	cameras.starCamera.rotation = cameras.camera.rotation;
	 	cameras.gridCamera.x = cameras.camera.x;
	 	cameras.gridCamera.y = cameras.camera.y;
	 	cameras.gridCamera.rotation = cameras.camera.rotation;
	 	var cameraDistance = 1/cameras.camera.zoom;
	 	cameras.starCamera.zoom = 1/(cameraDistance+10000);
	 	cameras.gridCamera.zoom = 1/(cameraDistance+5);
	 	cameras.minimapCamera.x = playerInfo.x;
	 	cameras.minimapCamera.y = playerInfo.y;
	 	cameras.minimapCamera.rotation = playerInfo.rotation;
		//drawing.clearCamera(cameras.starCamera);
		//game.clearCamera(cameras.minimapCamera);
		//console.log(myMouse.direction);
		socket.send({md:(myMouse.direction*myMouse.sensitivity)/dt});
		resetMouse();
	}
}

function messageHandler(data){
	//data = JSON.parse(data);
	if(data.x) playerInfo.x = data.x;
	if(data.y) playerInfo.y = data.y;
	if(data.rotation) playerInfo.rotation = data.rotation;
	if(data.velX) playerInfo.velX = data.velX;
	if(data.velY) playerInfo.velY = data.velY;
	if(data.rotationalVelocity) playerInfo.rotationalVelocity = data.rotationalVelocity;
	if(data.game) game = data.game;
	if(data.velocityClamps) hudInfo.velocityClamps = data.velocityClamps;
	if(data.stabilized || data.stabilized == false) hudInfo.stabilized = data.stabilized;
	if(data.powerDistribution) hudInfo.powerDistribution = data.powerDistribution;
	if(state==GAME_STATES.WAIT)
		state = GAME_STATES.PLAYING;
}

function FalseSocket(server){
	this.otherSocket = (server) ? server.attachSocket(this) : undefined;
	this.send = function(data){
		this.otherSocket.onmessage(data);
	};
	this.close = function(first){
		if(first) otherSocket.close(false);
		otherSocket = undefined;
		this.onclose();
	}
}