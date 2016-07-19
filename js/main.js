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
var app = app || {};

/*
 .main is an object literal that is a property of the app global
 This object literal has its own properties and methods (functions)
 
 */
app.main = {
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
	animationID:0,
	frameCount:0,
	runningTime:0,
	updatables:[],
	ship:{},
	otherShips:[],
	otherShipCount:0,
	maxOtherShips:10,
	hitscans:[],
	projectiles:[],
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
		gridLines: 500, //number of grid lines
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
}; // end app.main