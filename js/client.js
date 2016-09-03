'use strict'
var animationID = 0;
var lastTime = 0;
var cameras = {};
var accumulator = 0;
var socket;
var playerInfo = {x:0,y:0, rotation:0,velX:0,velY:0,rotationalVelocity:0};
var lastPlayerInfo = {x:0,y:0, rotation:0,velX:0,velY:0,rotationalVelocity:0};
var hudInfo = {};
var worldInfo = {
	objs:[],
	asteroids:[],
	radials:[],
	prjs:[],
	hitscans:[],
	drawing:{},
	targets:{},
	previousTargets:{}
};
var grid;
var state;
var GAME_STATES = {
	TITLE:0,
	PLAYING:1,
	DISCONNECTED:2,
	CHOOSESHIP:3,
	WAIT:4
};
var lastWorldUpdate;
var wiInterval = 33;
var entry = "";
var shipList = [];
var drawStarField = true;
var stars = {
		objs:[],
		colors:[
			'white'//,
			//'yellow'
		]
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
	resetWi();
	socket = new FalseSocket(server);
	socket.onmessage = messageHandler;	
	constructors.generateStarField(stars);
	pointerInit(canvas);
	state = GAME_STATES.TITLE;
	animationID = requestAnimationFrame(frame);
}

function frame(){
	animationID = requestAnimationFrame(frame);
	var now = Date.now().valueOf();
	var dt = (now-lastTime)/1000;

	lastTime = Date.now().valueOf();
	drawing.draw(cameras,dt);

	var step = .004;
	if(dt>step*4)
	{
			dt = step;
			console.log('throttle');
	}
	accumulator+=dt;
	while(accumulator>=step){
		update(step);
		accumulator-= step;
	}	
}

function update(dt){
	if((state == GAME_STATES.TITLE || state == GAME_STATES.DISCONNECTED) && myKeys.keydown[myKeys.KEYBOARD.KEY_ENTER])
	{
		state = GAME_STATES.CHOOSESHIP;
		myKeys.keydown[myKeys.KEYBOARD.KEY_ENTER] = false;
		entry = "";
		socket.send({requestShipList:true});
		//game.resetGame();
	}
	else if(state == GAME_STATES.CHOOSESHIP && myKeys.keydown[myKeys.KEYBOARD.KEY_ENTER])
	{
		state = GAME_STATES.WAIT;
		myKeys.keydown[myKeys.KEYBOARD.KEY_ENTER] = false;
		socket.send({gameId:'mainGame',ship:entry});
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

		
		//drawing.clearCamera(cameras.starCamera);
		//game.clearCamera(cameras.minimapCamera);
		//console.log(myMouse.direction);
		socket.send({md:(myMouse.direction*myMouse.sensitivity)/dt});
		resetMouse();
	}
}

function messageHandler(data){
	//data = JSON.parse(data);	
	if(state==GAME_STATES.WAIT)
	{
		if(data.interval) state = GAME_STATES.PLAYING;
		else if(data.badShipError)
		{
			entry = "";
			state = GAME_STATES.CHOOSESHIP;
			return;
		}
	}
	if(data.shipList)
		shipList = data.shipList;
	if(data.destroyed)
		state = GAME_STATES.DISCONNECTED;
	if(data.grid)
	{
		resetWi();
		lastWorldUpdate = Date.now().valueOf();
		grid = data.grid;
	}
	if(data.interval) wiInterval = data.interval;
	if(data.x) 
	{
		lastPlayerInfo.x = playerInfo.x;
		playerInfo.x = data.x;
	}
	if(data.y) 
	{
		lastPlayerInfo.y = playerInfo.y;
		playerInfo.y = data.y;
	}
	if(data.rotation) 
	{
		lastPlayerInfo.rotation = playerInfo.rotation;
		playerInfo.rotation = data.rotation;
	}
	if(data.velX) 
	{
		lastPlayerInfo.velX = playerInfo.velX;
		playerInfo.velX = data.velX;
	}
	if(data.velY) 
	{
		lastPlayerInfo.velY = playerInfo.velY;
		playerInfo.velY = data.velY;
	}
	if(data.rotationalVelocity) 
	{
		lastPlayerInfo.rotationalVelocity = playerInfo.rotationalVelocity;
		playerInfo.rotationalVelocity = data.rotationalVelocity;
	}
	if(data.velocityClamps) hudInfo.velocityClamps = data.velocityClamps;
	if(data.stabilized || data.stabilized == false) hudInfo.stabilized = data.stabilized;
	if(data.powerDistribution) hudInfo.powerDistribution = data.powerDistribution;
	if(data.worldInfo) 
	{
		for(var id in worldInfo.targets)
			worldInfo.previousTargets[id] = worldInfo.targets[id];
		worldInfo.targets = {};
		var now = Date.now().valueOf();
		lastWorldUpdate = now;
		//console.log('last: '+lastWorldUpdate+'\nnow: '+nextWorldUpdate+'\nnext: '+nextWorldUpdate);
		pushCollectionFromDataToWI(data.worldInfo,'objs');
		pushCollectionFromDataToWI(data.worldInfo,'prjs');
		pushCollectionFromDataToWI(data.worldInfo,'hitscans');
		pushCollectionFromDataToWI(data.worldInfo,'radials');
		worldInfo.asteroids = data.worldInfo.asteroids;
	}
}

function resetWi(){
	worldInfo = {
		objs:[],
		asteroids:[],
		radials:[],
		prjs:[],
		hitscans:[],
		drawing:{},
		targets:{},
		previousTargets:{}
	};
}

function pushCollectionFromDataToWI(dwi, type){
	for(var c = 0;c<dwi[type].length;c++)
		{
			if(type == 'hitscans')
				console.log(dwi[type].length);
			var obj = dwi[type][c];
			if(worldInfo.drawing.hasOwnProperty(obj.id))
			{
				//if(worldInfo.targets[obj.id])
				//	worldInfo.previousTargets[obj.id] = worldInfo.targets[obj.id];
				worldInfo.targets[obj.id] = obj;
				worldInfo.drawing[obj.id] = true;
			}
			else
			{
				worldInfo.previousTargets[obj.id] = deepObjectMerge({}, obj);
				worldInfo[type].push(obj);
				worldInfo.drawing[obj.id] = false;
			}
		}
}

function interpolatePiValue(val){
	
}

function interpolateWiValue(obj, val){
	var now = Date.now().valueOf();
	//console.log(updateInterval);
	var perc = (now - lastWorldUpdate)/wiInterval;
	obj[val] = lerp(worldInfo.previousTargets[obj.id][val], worldInfo.targets[obj.id][val], clamp(0,perc,1));
	return obj[val];
}

function removeIndexFromWiCollection(index, collection){
	var obj = collection[index];
	delete worldInfo.targets[obj.id];
	delete worldInfo.previousTargets[obj.id];
	delete worldInfo.drawing[obj.id];
	collection.splice(index,1);
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