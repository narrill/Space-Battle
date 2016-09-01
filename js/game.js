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
	updatables:[],
	ship:{},
	otherShips:[],
	otherShipCount:0,
	maxOtherShips:8,
	factions:4,
	players:[],
	respawnQueue:[],
	factionColors:[],
	hitscans:[],
	projectiles:[],
	radials:[],
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
		gridSpacing: 500, //pixels per grid unit
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
	asteroids:{
		total:60,
		colors:[
			'#6B2A06',
			'sienna'
		],
		objs:[]
	},
	stars:{
		objs:[],
		colors:[
			'white'//,
			//'yellow'
		]
	},
	baseStarCameraZoom:.0001,
	playerWeaponToggle:false,	
})}; // end app.main

server.attachSocket = function(s){
	var pid;
	var socket = new FalseSocket();
	socket.otherSocket = s;
	socket.onmessage = function(data){
		var player = server.players[pid];
		if(data.gameId) server.addPlayerToGame(player, data.gameId);
		if(player.game && data.ship)
		{
			var chosenShip = ships[data.ship];
			if(chosenShip){
				chosenShip.remoteInput = {};
				var sh = constructors.createShip(chosenShip,pl.game);
				player.currentShip = sh;
				player.game.otherShips.push(sh);
			}
		}
		if(player.currentShip && player.currentShip.remoteInput)
		{
			if(data.keyCode) player.currentShip.remoteInput.keyboard[data.keyCode] = data.pos;
			if(data.mb || data.mb==0) player.currentShip.remoteInput.mouse[data.mb] = data.pos;
			if(data.md || data.md==0) player.currentShip.remoteInput.mouseDirection = lerp(player.currentShip.remoteInput.mouseDirection, data.md, .5);
		}
	};
	socket.onclose = function(){
		if(players[pid].game)
			players[pid].game.players
		server.removePlayerFromGame(server.players[pid]);
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

server.addPlayerToGame = function(pl, gid){
	var g = server.games[gid];
	if(!g)
		return;
	if(g!=pl.game)
		server.removePlayerFromGame(pl);
	for(var c = 0;c<=g.players.length;c++){
		if(c==g.players.length)
		{
			g.players.push(pl);
			pl.pid = c;
			pl.game = g;
			break;
		}
		if(!g.players[c])
		{
			g.players[c] = pl;
			pl.pid = c;
			pl.game = g;
			break;
		}
	}
};
server.removePlayerFromGame = function(pl){
	if(!pl.game)
		return;
	pl.game.players[pl.pid] = undefined;
	pl.game = undefined;
}

server.players = [];