'use strict'
var animationID = 0;
var game = undefined;
var lastTime = 0;
var cameras = {};
var accumulator = 0;

function startClient(g){
	game = g;
	var canvas = game.canvas = document.querySelector('#canvas1');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	cameras.camera = constructors.createCamera(canvas,{x:game.ship.x,y:game.ship.y,rotation:game.ship.rotation,zoom:.5,minZoom:.025,maxZoom:5});
	cameras.camera.globalCompositeOperation = 'hard-light';
	cameras.starCamera = constructors.createCamera(canvas);
	cameras.gridCamera = constructors.createCamera(canvas);
	cameras.minimapCamera = constructors.createCamera(canvas,{zoom:.001,viewport:{startX:.83,startY:.7,endX:1,endY:1,parent:cameras.camera}});
	lastTime = Date.now().valueOf();
	animationID = requestAnimationFrame(frame);
}

function frame(){
	animationID = requestAnimationFrame(frame);
	var now = Date.now().valueOf();
	var dt = (now-lastTime)/1000;

	lastTime = Date.now().valueOf();
	drawing.draw.bind(game)(cameras,game,dt);

	if(dt>game.timeStep*4)
			dt = game.timeStep;
	accumulator+=dt;
	while(accumulator>=game.timeStep){
		update(game,game.timeStep);
		accumulator-= game.timeStep;
	}	
}

function update(game, dt){
	//camera shenanigans
		cameras.camera.x = lerp(cameras.camera.x,game.ship.x+game.ship.velocityX/10,12*dt);// game.ship.forwardVectorX*(cameras.camera.height/6)*(1/cameras.camera.zoom);
		cameras.camera.y = lerp(cameras.camera.y,game.ship.y+game.ship.velocityY/10,12*dt);// game.ship.forwardVectorY*(cameras.camera.height/6)*(1/cameras.camera.zoom);
		var rotDiff = game.ship.rotation+game.ship.rotationalVelocity/10 - cameras.camera.rotation;
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
	 	cameras.minimapCamera.x = game.ship.x;
	 	cameras.minimapCamera.y = game.ship.y;
	 	cameras.minimapCamera.rotation = game.ship.rotation;
		//drawing.clearCamera(cameras.starCamera);
		//game.clearCamera(cameras.minimapCamera);
		resetMouse();
}