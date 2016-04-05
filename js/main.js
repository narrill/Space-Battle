// main.js
// Dependencies: 
// Description: singleton object
// This object will be our main "controller" class and will contain references
// to most of the other objects in the game.

"use strict";

// if app exists use the existing copy
// else create a new object literal
var app = app || {};

/*
 .main is an object literal that is a property of the app global
 This object literal has its own properties and methods (functions)
 
 */
app.main = {
   	lastTime: 0, // used by calculateDeltaTime() 
    debug: true,
	paused:false,
	animationID:0,
	frameCount:0,
	runningTime:0,
	ship:{
		x:0,
		y:0,
		velocityX:0,
		velocityY:0,
		rotationalVelocity:0,
		rotation:0,
		thrusterStrength:1500,
		lateralThrusterStrength:1000,
		sideThrusterStrength:500,
		color:'red',
		thrusterColor:'green',
		thrusterEfficiency:1000,
		stabilizerStrength:60,
		lastLaserTime:0,
		laserCD: 1,
		activeThrusters:{}//leave this empty - it gets filled by the thruster methods
	},
	camera:{
		x:0,
		y:0,
		rotation:0,
		zoom:1,
		width:0,
		height:0,
		ctx:undefined
	},
	worldCamera:{
		x:0,
		y:0,
		rotation:0,
		zoom:1,
		width:0,
		height:0,
		ctx:undefined
	},
	grid:{
		gridLines: 50,
		gridSpacing: 100,
		gridStart: [-1000,-1000]
	},
	asteroids:[],
    // methods
	init : function() {
		// initialize properties
		var canvas = document.querySelector('#canvas1');
		canvas.onmousedown = this.doMousedown.bind(this);
		//canvas.width = this.WIDTH;
		//canvas.height = this.HEIGHT;
		var canvas2 = document.querySelector('#canvas2');
		canvas2.onmousedown = this.doMousedown.bind(this);
		//canvas2.width = this.WIDTH;
		//canvas2.height = this.HEIGHT;
		this.camera = this.initializeCamera(canvas);
		this.worldCamera = this.initializeCamera(canvas2, 200, 200,0,.5);
		this.makeAsteroids.bind(this)();
		// start the game loop
		this.update();
	},
	initializeCamera:function(canvas,x,y,rotation,zoom){
		return {
			x:(x) ? x : 0,
			y:(y) ? y : 0,
			rotation:(rotation) ? rotation : 0,
			zoom: (zoom) ? zoom : 1,
			width:canvas.width,
			height:canvas.height,
			ctx:canvas.getContext('2d')
		};
	},
	clearCamera:function(camera){
		var ctx = camera.ctx;
		ctx.fillStyle = "black"; 
		ctx.fillRect(0,0,camera.width,camera.height);
	},
	reset:function(){
	},
	doMousedown: function(e){
	},
	drawGrid:function(camera){
		var ctx = camera.ctx;
		var gridLines = this.grid.gridLines;
		var gridSpacing = this.grid.gridSpacing;
		var gridStart = this.grid.gridStart;
		ctx.save();
		ctx.beginPath();
		for(var x = 0;x<=gridLines;x++){
			var start = [gridStart[0]+x*gridSpacing,gridStart[1]];
			var end = [start[0],gridStart[1]+gridLines*gridSpacing];
			start = worldPointToCameraSpace(start[0],start[1],camera);
			end = worldPointToCameraSpace(end[0],end[1],camera);			
			ctx.moveTo(start[0],start[1]);
			ctx.lineTo(end[0],end[1]);
		}
		for(var y = 0;y<=gridLines;y++){
			var start = [gridStart[0],gridStart[0]+y*gridSpacing];
			var end = [gridStart[0]+gridLines*gridSpacing,start[1]];
			start = worldPointToCameraSpace(start[0],start[1],camera);
			end = worldPointToCameraSpace(end[0],end[1],camera);
			ctx.moveTo(start[0],start[1]);
			ctx.lineTo(end[0],end[1]);
		}

		ctx.strokeWidth = 5;
		ctx.strokeStyle = 'blue';
		ctx.stroke();
		ctx.restore();
	},
	makeAsteroids:function(){
		this.asteroids = [
			{
				x:50,
				y:50,
				radius:50,
				color:'saddlebrown'
			},
			{
				x:400,
				y:100,
				radius:50,
				color:'saddlebrown'
			},
			{
				x:350,
				y:400,
				radius:50,
				color:'saddlebrown'
			}
		];
	},
	drawShip: function(ship, camera, debug){
		var ctx = camera.ctx;
		//ship at center
		ctx.save();
		//ctx.translate(camera.width/2,camera.height/2);
		var dx = ship.x-camera.x;
		var dy = ship.y-camera.y;
		var dr = ship.rotation-camera.rotation;
		var rotatedD = rotate(0,0,dx,dy,camera.rotation);
		var shipPosInCameraSpace = worldPointToCameraSpace(ship.x,ship.y,camera);
		ctx.translate(shipPosInCameraSpace[0],shipPosInCameraSpace[1]);
		ctx.rotate(dr* (Math.PI / 180));
		ctx.scale(camera.zoom,camera.zoom);

		if(ship.activeThrusters.main>0){
			ctx.save();				
			ctx.fillStyle = ship.thrusterColor;
			ctx.beginPath();
			ctx.moveTo(-15,10);
			ctx.lineTo(-10,10);
			ctx.lineTo(-12.5,10+30*ship.activeThrusters.main/ship.thrusterEfficiency);
			ctx.closePath();
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(15,10);
			ctx.lineTo(10,10);
			ctx.lineTo(12.5,10+30*ship.activeThrusters.main/ship.thrusterEfficiency);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}
		else if(ship.activeThrusters.main<0){
			ctx.save();				
			ctx.fillStyle = ship.thrusterColor;
			ctx.beginPath();
			ctx.moveTo(-15,0);
			ctx.lineTo(-10,0);
			ctx.lineTo(-12.5,-20+10*ship.activeThrusters.main/ship.thrusterEfficiency);
			ctx.closePath();
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(15,0);
			ctx.lineTo(10,0);
			ctx.lineTo(12.5,-20+10*ship.activeThrusters.main/ship.thrusterEfficiency);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}
		if(ship.activeThrusters.side>0){
			ctx.save();				
			ctx.fillStyle = ship.thrusterColor;
			ctx.beginPath();
			ctx.moveTo(-5,-10);
			ctx.lineTo(-5,-15);
			//console.log(ship.activeThrusters.side);
			ctx.lineTo(-20-30*ship.activeThrusters.side/ship.thrusterEfficiency,-12.5);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}
		else if(ship.activeThrusters.side<0){
			ctx.save();				
			ctx.fillStyle = ship.thrusterColor;
			ctx.beginPath();
			ctx.moveTo(5,-10);
			ctx.lineTo(5,-15);
			//console.log(ship.activeThrusters.side);
			ctx.lineTo(20-30*ship.activeThrusters.side/ship.thrusterEfficiency,-12.5);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}
		if(ship.activeThrusters.lateral>0){
			ctx.save();				
			ctx.fillStyle = ship.thrusterColor;
			ctx.beginPath();
			ctx.moveTo(-10,0);
			ctx.lineTo(-10,-5);
			//console.log(ship.activeThrusters.side);
			ctx.lineTo(-20-30*ship.activeThrusters.lateral/ship.thrusterEfficiency,-2.5);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}
		else if(ship.activeThrusters.lateral<0){
			ctx.save();				
			ctx.fillStyle = ship.thrusterColor;
			ctx.beginPath();
			ctx.moveTo(10,0);
			ctx.lineTo(10,-5);
			//console.log(ship.activeThrusters.side);
			ctx.lineTo(20-30*ship.activeThrusters.lateral/ship.thrusterEfficiency,-2.5);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}
		ctx.beginPath();
		ctx.moveTo(-20,10);
		ctx.lineTo(20,10);
		ctx.lineTo(0,-30);
		ctx.closePath();
		ctx.fillStyle = ship.color;
		ctx.fill();
		ctx.restore();
	},
	updateShip: function(ship,dt){
		var accelerationX = 0;
		var accelerationY = 0;
		var rotationalAcceleration = 0;
		var mainThrust = ship.activeThrusters.main;
		if(mainThrust){
			var strength = mainThrust;
			var maxStrength = ship.thrusterStrength;
			strength = Math.max(-maxStrength, Math.min(strength, maxStrength));
			ship.activeThrusters.main = strength;
			var baseAccel = [0,-strength];
			var rotatedAccel = rotate(0,0,baseAccel[0],baseAccel[1],-ship.rotation);
			accelerationX += rotatedAccel[0];
			accelerationY += rotatedAccel[1];
		}
		var latThrust = ship.activeThrusters.lateral;
		if(latThrust){
			var strength = latThrust;
			var maxStrength = ship.lateralThrusterStrength;
			strength = Math.max(-maxStrength, Math.min(strength, maxStrength));
			ship.activeThrusters.lateral = strength;
			var baseAccel = [0,-strength];
			var rotatedAccel = rotate(0,0,baseAccel[0],baseAccel[1],-ship.rotation-90);
			accelerationX += rotatedAccel[0];
			accelerationY += rotatedAccel[1];
		}
		var rotThrust = ship.activeThrusters.side;
		if(rotThrust){
			var strength = rotThrust;
			var maxStrength = ship.sideThrusterStrength;
			strength = Math.max(-maxStrength, Math.min(strength, maxStrength));
			ship.activeThrusters.side = strength;
			rotationalAcceleration = strength;
		}
		//accelerate
		ship.velocityX+=accelerationX*dt;
		ship.velocityY+=accelerationY*dt;
		ship.rotationalVelocity+=rotationalAcceleration*dt;
		//move
		ship.x+=ship.velocityX*dt;
		ship.y+=ship.velocityY*dt;
		ship.rotation+=ship.rotationalVelocity*dt;
	},
	shipClearThrusters:function(ship){
		ship.activeThrusters = {};
	},
	shipThrusters:function(ship, strength){
		if(!ship.activeThrusters.main)
			ship.activeThrusters.main = 0;

		ship.activeThrusters.main += strength;
	},
	shipSideThrusters: function(ship, strength){
		if(!ship.activeThrusters.side)
			ship.activeThrusters.side = 0;

		ship.activeThrusters.side += strength;
	},
	shipLateralThrusters:function(ship, strength){
		if(!ship.activeThrusters.lateral)
			ship.activeThrusters.lateral = 0;

		ship.activeThrusters.lateral += strength;
	},
	shipRotationalStabilizers:function(ship){
		ship.rotationalAcceleration = 0;
		this.shipSideThrusters(ship,-ship.rotationalVelocity*ship.stabilizerStrength);
	},
	shipMedialStabilizers:function(ship){
		var rotatedForwardVector = rotate(0,0,0,1,-ship.rotation);
		var medialVelocity = scalarComponentOf1InDirectionOf2(ship.velocityX,ship.velocityY,rotatedForwardVector[0],rotatedForwardVector[1]);

		this.shipThrusters(ship,medialVelocity*ship.stabilizerStrength);
	},
	shipLateralStabilizers:function(ship){
		var rotatedForwardVector = rotate(0,0,0,1,-ship.rotation-90);
		var lateralVelocity = scalarComponentOf1InDirectionOf2(ship.velocityX,ship.velocityY,rotatedForwardVector[0],rotatedForwardVector[1]);

		this.shipLateralThrusters(ship,lateralVelocity*ship.stabilizerStrength);
	},
	drawAsteroids: function(asteroids,camera, debug){
		var ctx = camera.ctx;
		asteroids.forEach(function(asteroid){
			//ship at center
			ctx.save();
			var finalPosition = worldPointToCameraSpace(asteroid.x,asteroid.y,camera);
			ctx.translate(finalPosition[0],finalPosition[1]);
			ctx.scale(camera.zoom,camera.zoom);
			ctx.beginPath();
			ctx.arc(0,0,asteroid.radius,0,Math.PI*2);
			ctx.fillStyle = asteroid.color;
			ctx.fill();
			ctx.restore();
		});
	},
	update: function(){
	 	this.animationID = requestAnimationFrame(this.update.bind(this));
	 	
	 	if(this.paused){
	 		this.drawPauseScreen(this.camera);
	 		this.drawPauseScreen(this.worldCamera);
	 		return;
	 	}
	 	
	 	var dt = this.calculateDeltaTime();
	 	
		this.clearCamera(this.camera);
		this.clearCamera(this.worldCamera);
		this.drawGrid(this.camera);
		this.drawGrid(this.worldCamera);
		this.drawAsteroids(this.asteroids,this.camera);
		this.drawAsteroids(this.asteroids,this.worldCamera);
		//this.drawShip(this.ctx,this.otherShip,this.camera);
		this.updateShip(this.ship,dt);
		this.camera.x = this.ship.x;
	 	this.camera.y = this.ship.y;
	 	this.camera.rotation = this.ship.rotation;
		this.drawShip(this.ship,this.camera);
		this.drawShip(this.ship,this.worldCamera);
		//this.drawShip(this.ctx2,this.otherShip,this.camera, true);
		this.shipClearThrusters(this.ship);
		/*
		//manual controls
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_W] && myKeys.keydown[myKeys.KEYBOARD.KEY_SHIFT])
			this.shipMedialStabilizers(this.ship);
		else if(myKeys.keydown[myKeys.KEYBOARD.KEY_W])
			this.shipThrusters(this.ship,this.ship.thrusterStrength/3);			
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_A])
			this.shipSideThrusters(this.ship,-this.ship.sideThrusterStrength/3);
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_D])
			this.shipSideThrusters(this.ship,this.ship.sideThrusterStrength/3);
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_S] && myKeys.keydown[myKeys.KEYBOARD.KEY_SHIFT])
			this.shipRotationalStabilizers(this.ship);
		else if(myKeys.keydown[myKeys.KEYBOARD.KEY_S])
			this.shipThrusters(this.ship,-this.ship.thrusterStrength/3);
		if((myKeys.keydown[myKeys.KEYBOARD.KEY_Q] || myKeys.keydown[myKeys.KEYBOARD.KEY_E]) && myKeys.keydown[myKeys.KEYBOARD.KEY_SHIFT])
			this.shipLateralStabilizers(this.ship);
		else{
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_Q])
				this.shipLateralThrusters(this.ship,-this.ship.lateralThrusterStrength/3);
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_E])
				this.shipLateralThrusters(this.ship,this.ship.lateralThrusterStrength/3);		
		}*/

		//assisted controls
		//medial motion
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_W])
			this.shipThrusters(this.ship,this.ship.thrusterStrength/3);
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_S])
			this.shipThrusters(this.ship,-this.ship.thrusterStrength/3);
		if(!(myKeys.keydown[myKeys.KEYBOARD.KEY_W] || myKeys.keydown[myKeys.KEYBOARD.KEY_S]))
			this.shipMedialStabilizers(this.ship);
		//lateral motion
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_Q])
			this.shipLateralThrusters(this.ship,-this.ship.lateralThrusterStrength/3);
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_E])
			this.shipLateralThrusters(this.ship,this.ship.lateralThrusterStrength/3);
		if(!(myKeys.keydown[myKeys.KEYBOARD.KEY_Q] || myKeys.keydown[myKeys.KEYBOARD.KEY_E]))
			this.shipLateralStabilizers(this.ship);
		//rotational motion
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_A])
			this.shipSideThrusters(this.ship,-this.ship.sideThrusterStrength/3);
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_D])
			this.shipSideThrusters(this.ship,this.ship.sideThrusterStrength/3);
		if(!(myKeys.keydown[myKeys.KEYBOARD.KEY_A] || myKeys.keydown[myKeys.KEYBOARD.KEY_D]))
			this.shipRotationalStabilizers(this.ship);

		if(myKeys.keydown[myKeys.KEYBOARD.KEY_UP])
			this.worldCamera.zoom*=.95;
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_DOWN])
			this.worldCamera.zoom*=1.05;

		if (this.debug){
			// draw dt in bottom right corner
		}
		this.frameCount++;
	},
	drawHUD: function(ctx){
		ctx.save(); // NEW
		
		ctx.restore(); // NEW
	},
	drawPauseScreen:function(camera){
		var ctx = camera.ctx;
		ctx.save();
		ctx.fillStyle = "black",
		ctx.fillRect(0,0,camera.width,camera.height);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		this.fillText(ctx,"...paused...",camera.width/2,camera.height/2,"5pt courier",'white');
		ctx.restore();
	},
	pauseGame:function(){
		this.paused = true;
		cancelAnimationFrame(this.animationID);
		this.update();
	},
	resumeGame:function(){
		cancelAnimationFrame(this.animationID);
		this.paused = false;
		this.update();
	},
	fillText: function(ctx,string, x, y, css, color) {
		ctx.save();
		// https://developer.mozilla.org/en-US/docs/Web/CSS/font
		ctx.font = css;
		ctx.fillStyle = color;
		ctx.fillText(string, x, y);
		ctx.restore();
	},	
	calculateDeltaTime: function(){
		// what's with (+ new Date) below?
		// + calls Date.valueOf(), which converts it from an object to a 	
		// primitive (number of milliseconds since January 1, 1970 local time)
		var now,fps;
		now = (Date.now().valueOf()); 
		fps = 1000 / (now - this.lastTime);
		fps = clamp(fps, 12, 60);
		this.lastTime = now; 
		return 1/fps;
	}    
}; // end app.main