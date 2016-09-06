// main.js
// Dependencies: 
// Description: singleton object
// This object will be our main "controller" class and will contain references
// to most of the other objects in the game.

"use strict";

var thrusterDetail = 3;
var hitscanDetail = 3;

// if app exists use the existing copy
// else create a new object literal
var server = server || {};
server.shipList = [];
for (var key in ships)
	if(ships.hasOwnProperty(key)) server.shipList.push(key);
server.attachSocket = function(s){
	var pid;
	var socket = new FalseSocket();
	socket.otherSocket = s;
	socket.onmessage = function(data){
		var player = server.players[pid];
		if(data.destroyed)
		{
			player.remoteSend = undefined;
			player.socket.send({destroyed:true});
		}
		if(data.requestShipList)
		{
			player.socket.send({shipList:server.shipList});
		}
		if(data.gameId)
		{
			server.disconnectPlayer(player);

			var g = server.games[data.gameId];
			if(g)
			{
				player.game = g;
				player.socket.send({grid:g.grid});
			}
			delete data.gameId;
		}
		if(player.game && data.ship)
		{
			var chosenShip = ships[data.ship.toLowerCase().valueOf()];
			if(chosenShip){
				chosenShip.remoteInput = {};
				var sh = constructors.createShip(chosenShip,pl.game);
				player.game.otherShips.push(sh);
				if(sh.remoteInput)
				{
					sh.remoteInput.remoteSend = function(data){player.socket.send(data)};
					player.remoteSend = sh.remoteInput.messageHandler;
				}
			}
			else
				player.socket.send({badShipError:true});
			delete data.ship;
		}
		if(player.remoteSend)
		{
			player.remoteSend(data);
		}
	};
	socket.onclose = function(){
		//server.removePlayerFromGame(server.players[pid]);
		disconnectPlayer(server.players[pid]);
		server.players[pid] = undefined;
	};
	var pl = constructors.createPlayer({socket:socket});
	for(var c = 0;c<=server.players.length;c++)
	{
		if(c==server.players.length)
		{
			server.players.push(pl);
			pid = c;
			break;
		}
		if(!server.players[c])
		{
			server.players[c] = pl;
			pid = c;
			break;
		}
	}
	return socket;
}

server.disconnectPlayer = function(player){
	if(player.remoteSend)
	{
		player.remoteSend({disconnect:true});
		delete player.remoteSend;
	}
};
server.idCounter = 0;
server.takeIdTag = function(){
	var id;
	while(server.idDictionary.hasOwnProperty(server.idCounter))
		server.idCounter++;
	id = server.idCounter;
	if(!Number.isSafeInteger(server.idCounter))
		server.idCounter = 0;
	server.idDictionary[id] = true;
	return id;
}
server.idDictionary = {};

server.players = [];

/*
 .main is an object literal that is a property of the app global
 This object literal has its own properties and methods (functions)
 
 */
server.games = {mainGame:gameFunctions.init({
	canvas: undefined,
	minimapCanvas: undefined,
	accumulator:0,
	timeStep:.005,
	updatesPerDraw:0,
	drawStarField:true,
	thrusterSound:undefined,
	soundLevel:2.5,
	gameState:0,
   	lastTime: 0, // used by calculateDeltaTime() 
    debug: true,
	paused:false,
	frameTimeout:undefined,
	frameCount:0,
	runningTime:0,
	idCounter:0,
	updatables:[],
	ship:{},
	otherShips:[],
	otherShipCount:0,
	maxOtherShips:2,
	factions:4,
	players:[],
	respawnQueue:[],
	factionColors:[],
	hitscans:[],
	projectiles:[],
	radials:[],
	reportQueue:undefined,
	functionQueue:[],
	camera:{
		//position/rotation
		x:0,
		y:0,
		rotation:0,
		//scale value, basically
		zoom:1,
		minZoom:.0001,
		maxZoom:5,
		//screen dimensions
		width:0,
		height:0,
		//the canvas context this camera draws to
		ctx:undefined
	},
	starCamera:{
		x:0,
		y:0,
		rotation:0,
		zoom:1,
		width:0,
		height:0,
		ctx:undefined
	},
	gridCamera:{},
	minimapCamera:{},
	grid:{
		gridLines: 1000, //number of grid lines
		gridSpacing: 2000, //pixels per grid unit
		gridStart: [-125000,-125000], //corner anchor in world coordinates
		colors:[
			{
				color:'#1111FF',
				interval:1000
			},
			{
				color:'blue',
				interval:200
			},
			{
				color:'mediumblue',
				interval:50,
				minimap: true
			},
			{
				color:'darkblue',
				interval:10
			},
			{
				color:'navyblue',
				interval:2
			}
		]
	},
	tileArray:undefined,
	asteroids:{
		total:60,
		colors:[
			'#6B2A06',
			'sienna'
		],
		objs:[]
	},
	baseStarCameraZoom:.0001,
	playerWeaponToggle:false,	
})}; // end app.main

function SuperArray(size){
	this.count = size;
	this.array = [];
	this.push = function(ob){
		this.array[this.count] = ob;
		this.count++;
	};
	this.clean = function(){
		for(var c = this.count; c<this.array.length;c++){
			this.array[c] = undefined;
		}
	};
	this.clear = function(){
		for(var c = 0;c<this.array.length;c++)
			this.array[c] = undefined;
		this.count = 0;
	};
	this.forEach = function(f){
		for(var c = 0;c<this.count && c<this.array.length;c++)
			f(this.array[c]);
	};
	this.get = function(index){
		return this.array[index];
	};
	this.set = function(index, val){
		if(index>this.count)
			this.count = index;
		this.array[index] = val;
	};
	this.clear();
}