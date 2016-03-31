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
	ship:{
		x:0,
		y:0,
		velocityX:0,
		velocityY:0,
		accelerationX:0,
		accelerationY:0,
		rotationalVelocity:0,
		rotationalAcceleration:0,
		rotation:0,
		color:'red',
		lastLaserFrame:0
	},
	asteroids:[],
    // methods
	init : function() {
		// initialize properties
		this.canvas = document.querySelector('#canvas1');
		this.canvas.onmousedown = this.doMousedown.bind(this);
		this.canvas.width = this.WIDTH;
		this.canvas.height = this.HEIGHT;
		this.ctx = this.canvas.getContext('2d');
		this.canvas2 = document.querySelector('#canvas2');
		this.canvas2.onmousedown = this.doMousedown.bind(this);
		this.canvas2.width = this.WIDTH;
		this.canvas2.height = this.HEIGHT;
		this.ctx2 = this.canvas2.getContext('2d');
		this.makeAsteroids.bind(this)();
		// start the game loop
		this.update();
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
	drawShip: function(ctx, ship,screenWidth,screenHeight, debug){
		if(!debug){
			//ship at center
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(screenWidth/2-20,screenHeight/2+20);
			ctx.lineTo(screenWidth/2+20,screenHeight/2+20);
			ctx.lineTo(screenWidth/2,screenHeight/2-20);
			ctx.closePath();
			ctx.fillStyle = ship.color;
			ctx.fill();
			ctx.restore();
		}
		else{
			//ship at world pos
			ctx.save();
			ctx.translate(ship.x,ship.y);
			ctx.rotate(ship.rotation * (Math.PI / 180));
			ctx.beginPath();
			ctx.moveTo(-20,20);
			ctx.lineTo(20,20);
			ctx.lineTo(0,-20);
			ctx.closePath();
			ctx.fillStyle = ship.color;
			ctx.fill();
			ctx.restore();
		}
	},
	updateShip: function(dt,ship){
		//accelerate
		ship.velocityX+=ship.accelerationX*dt;
		ship.velocityY+=ship.accelerationY*dt;
		ship.rotationalVelocity+=ship.rotationalAcceleration*dt;
		//move
		ship.x+=ship.velocityX*dt;
		ship.y+=ship.velocityY*dt;
		ship.rotation+=ship.rotationalVelocity*dt;
		//reset accelerations
		ship.accelerationX = 0;
		ship.accelerationY = 0;
		ship.rotationalAcceleration = 0;
	},
	shipThrusters:function(ship){
		var baseAccel = [0,-50];
		var rotatedAccel = rotate(0,0,baseAccel[0],baseAccel[1],-ship.rotation);
		ship.accelerationX = rotatedAccel[0];
		ship.accelerationY = rotatedAccel[1];
	},
	shipSideThrusters: function(ship, cw){
		ship.rotationalAcceleration = (cw)?20:-20;
	},
	drawAsteroids: function(ctx,asteroids,ship, screenWidth,screenHeight, debug){
		asteroids.forEach(function(asteroid){
			//ship at center
			if(!debug){
			ctx.save();
				var shipToAsteroidVector = [asteroid.x-ship.x,asteroid.y-ship.y];	
				var rotatedVector = rotate(0,0,shipToAsteroidVector[0],shipToAsteroidVector[1],ship.rotation);
				var finalPosition = [screenWidth/2+rotatedVector[0],screenHeight/2+rotatedVector[1]];
				ctx.beginPath();
				ctx.arc(finalPosition[0],finalPosition[1],asteroid.radius,0,Math.PI*2);
				ctx.fillStyle = asteroid.color;
				ctx.fill();
				ctx.restore();
			}
			else{
				//world pos
				ctx.save();
				ctx.beginPath();
				ctx.arc(asteroid.x,asteroid.y,asteroid.radius,0,Math.PI*2);
				ctx.fillStyle = asteroid.color;
				ctx.fill();
				ctx.restore();
			}
		});
	},
	update: function(){
	 	this.animationID = requestAnimationFrame(this.update.bind(this));
	 	
	 	if(this.paused){
	 		this.drawPauseScreen(this.ctx);
	 		return;
	 	}
	 	
	 	var dt = this.calculateDeltaTime();

		this.ctx.fillStyle = "black"; 
		this.ctx.fillRect(0,0,this.WIDTH,this.HEIGHT);
		this.drawAsteroids(this.ctx,this.asteroids,this.ship,this.WIDTH,this.HEIGHT);
		this.updateShip(dt,this.ship);
		this.drawShip(this.ctx,this.ship,this.WIDTH,this.HEIGHT);

		this.ctx2.fillStyle = "black"; 
		this.ctx2.fillRect(0,0,this.WIDTH,this.HEIGHT);
		this.drawAsteroids(this.ctx2,this.asteroids,this.ship,this.WIDTH,this.HEIGHT, true);
		this.drawShip(this.ctx2,this.ship,this.WIDTH,this.HEIGHT, true);

		if(myKeys.keydown[myKeys.KEYBOARD.KEY_W])
			this.shipThrusters(this.ship);
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_A])
			this.shipSideThrusters(this.ship,false);
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_D])
			this.shipSideThrusters(this.ship,true);

		if (this.debug){
			// draw dt in bottom right corner
		}
		frameCount++;
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
		now = (+new Date); 
		fps = 1000 / (now - this.lastTime);
		fps = clamp(fps, 12, 60);
		this.lastTime = now; 
		return 1/fps;
	}    
}; // end app.main