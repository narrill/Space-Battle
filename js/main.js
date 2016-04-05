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
	//  properties
    WIDTH : 640, 
    HEIGHT: 480,
    canvas: undefined,
    canvas2:undefined,
    ctx: undefined,
    ctx2:undefined,
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
		sideThrusterStrength:150,
		color:'red',
		thrusterColor:'blue',
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
	asteroids:[],
    // methods
	init : function() {
		// initialize properties
		var canvas = document.querySelector('#canvas1');
		canvas.onmousedown = this.doMousedown.bind(this);
		canvas.width = this.WIDTH;
		canvas.height = this.HEIGHT;
		var canvas2 = document.querySelector('#canvas2');
		canvas2.onmousedown = this.doMousedown.bind(this);
		canvas2.width = this.WIDTH;
		canvas2.height = this.HEIGHT;
		this.camera = this.initializeCamera(canvas);
		this.worldCamera = this.initializeCamera(canvas2);
		this.makeAsteroids.bind(this)();
		// start the game loop
		this.update();
	},
	initializeCamera:function(camera, canvas){
		return {
			x:0,
			y:0,
			rotation:0,
			zoom:1,
			width:canvas.width,
			height:canvas.height,
			ctx:canvas.getContext('2d')
		};
	},
	clearCamera:function(camera){
		ctx = camera.ctx;
		ctx.fillStyle = "black"; 
		ctx.fillRect(0,0,camera.width,camera.height);
	},
	reset:function(){
	},
	doMousedown: function(e){
	},
	makeAsteroids:function(){
		this.asteroids = [
			{
				x:50,
				y:50,
				radius:50,
				color:'brown'
			},
			{
				x:400,
				y:100,
				radius:50,
				color:'brown'
			},
			{
				x:350,
				y:400,
				radius:50,
				color:'brown'
			}
		];
	},
	drawShip: function(ship, camera, debug){
		var ctx = camera.ctx;
		//ship at center
		ctx.save();
		ctx.translate(camera.width/2,camera.height/2);
		var dx = ship.x-camera.x;
		var dy = ship.y-camera.y;
		var dr = ship.rotation-camera.rotation;
		var rotatedD = rotate(0,0,dx,dy,camera.rotation);
		ctx.translate(rotatedD[0],rotatedD[1]);
		ctx.rotate(dr* (Math.PI / 180));

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
			console.log(ship.activeThrusters.side);
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
			console.log(ship.activeThrusters.side);
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
			console.log(ship.activeThrusters.side);
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
			console.log(ship.activeThrusters.side);
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
			var shipToAsteroidVector = [asteroid.x-camera.x,asteroid.y-camera.y];	
			var rotatedVector = rotate(0,0,shipToAsteroidVector[0],shipToAsteroidVector[1],camera.rotation);
			var finalPosition = [camera.width/2+rotatedVector[0],camera.height/2+rotatedVector[1]];
			ctx.beginPath();
			ctx.arc(finalPosition[0],finalPosition[1],asteroid.radius,0,Math.PI*2);
			ctx.fillStyle = asteroid.color;
			ctx.fill();
			ctx.restore();
		});
	},
	update: function(){
	 	this.animationID = requestAnimationFrame(this.update.bind(this));
	 	
	 	if(this.paused){
	 		this.drawPauseScreen(this.ctx);
	 		return;
	 	}
	 	
	 	var dt = this.calculateDeltaTime();
	 	
		this.clearCamera(this.camera);
		this.clearCamera(this.worldCamera);
		this.drawAsteroids(this.asteroids,this.camera);
		//this.drawShip(this.ctx,this.otherShip,this.camera);
		this.updateShip(this.ship,dt);
		this.camera.x = this.ship.x;
	 	this.camera.y = this.ship.y;
	 	this.camera.rotation = this.ship.rotation;
		this.drawShip(this.ship,this.camera);
		//this.drawShip(this.ctx2,this.otherShip,this.camera, true);
		this.shipClearThrusters(this.ship);
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
		}

		if (this.debug){
			// draw dt in bottom right corner
		}
		this.frameCount++;
	},
	drawHUD: function(ctx){
		ctx.save(); // NEW
		
		ctx.restore(); // NEW
	},
	drawPauseScreen:function(ctx){
		ctx.save();
		ctx.fillStyle = "black",
		ctx.fillRect(0,0,this.WIDTH,this.HEIGHT);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		this.fillText(this.ctx,"...paused...",this.WIDTH/2,this.HEIGHT/2,"5pt courier",'white');
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