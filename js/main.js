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
		//position/rotation
		x:0,
		y:0,		
		rotation:0,
		//velocities
		velocityX:0, //in absolute form, used for movement
		velocityY:0,
		rotationalVelocity:0,
		medialVelocity:0, //component form, used by stabilizers
		lateralVelocity:0,
		//max thruster strengths in pixels/second/second
		thrusterStrength:3000,
		lateralThrusterStrength:2000,
		sideThrusterStrength:1000,
		//colors
		color:'red',
		thrusterColor:'green',
		//determines the length of the thruster trail, purely visual
		thrusterEfficiency:1000,
		//correctional coefficient used by the stabilizers
		stabilizerStrength:60,
		//used for controlling laser fire rate
		lastLaserTime:0,
		laserCD: 1,
		laserRange:500,
		laserColor:'red',
		//per-frame thruster strengths
		activeThrusters:{
			main:0,
			lateral:0,
			side:0
		},
		//maximum velocities in each direction
		//thrusters will not be used to accelerate past these values
		thrusterClamps:{
			main:1500,
			lateral: 1000,
			side: 180
		}
	},
	lasers:[],
	camera:{
		//position/rotation
		x:0,
		y:0,
		rotation:0,
		//scale value, basically
		zoom:1,
		//screen dimensions
		width:0,
		height:0,
		//the canvas context this camera draws to
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
		gridLines: 500, //number of grid lines
		gridSpacing: 500, //pixels per grid unit
		gridStart: [-1000,-1000] //corner anchor in world coordinates
	},
	asteroids:[],
    // methods
	init : function() {
		// initialize properties
		var canvas = document.querySelector('#canvas1');
		canvas.onmousedown = this.doMousedown.bind(this);
		var canvas2 = document.querySelector('#canvas2');
		canvas2.onmousedown = this.doMousedown.bind(this);
		this.camera = this.initializeCamera(canvas,0,0,0,.5);
		this.worldCamera = this.initializeCamera(canvas2, 200, 200,0,.5);
		this.makeAsteroids.bind(this)();
		// start the game loop
		this.update();
	},
	//returns a camera object with the given values and the context from the given canvas
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
	//clears the given camera's canvas
	clearCamera:function(camera){
		var ctx = camera.ctx;
		ctx.fillStyle = "black"; 
		ctx.fillRect(0,0,camera.width,camera.height);
	},
	reset:function(){
	},
	doMousedown: function(e){
	},
	//draws the grid in the given camera
	drawGrid:function(camera){
		var ctx = camera.ctx;
		var gridLines = this.grid.gridLines;
		var gridSpacing = this.grid.gridSpacing;
		var gridStart = this.grid.gridStart;

		ctx.save();
		ctx.beginPath();
		for(var x = 0;x<=gridLines;x++){
			//define start and end points for current line in world space
			var start = [gridStart[0]+x*gridSpacing,gridStart[1]];
			var end = [start[0],gridStart[1]+gridLines*gridSpacing];
			//convert to camera space
			start = worldPointToCameraSpace(start[0],start[1],camera);
			end = worldPointToCameraSpace(end[0],end[1],camera);			
			ctx.moveTo(start[0],start[1]);
			ctx.lineTo(end[0],end[1]);
		}
		for(var y = 0;y<=gridLines;y++){
			//same as above, but perpendicular
			var start = [gridStart[0],gridStart[0]+y*gridSpacing];
			var end = [gridStart[0]+gridLines*gridSpacing,start[1]];
			start = worldPointToCameraSpace(start[0],start[1],camera);
			end = worldPointToCameraSpace(end[0],end[1],camera);
			ctx.moveTo(start[0],start[1]);
			ctx.lineTo(end[0],end[1]);
		}
		//draw all lines, stroke last
		ctx.strokeWidth = 5;
		ctx.strokeStyle = 'blue';
		ctx.stroke();
		ctx.restore();
	},
	//generates the field of asteroids
	makeAsteroids:function(){
		this.asteroids = [
			{
				//position, readius, color
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
	//draws the given ship in the given camera
	drawShip: function(ship, camera){
		var ctx = camera.ctx;
		ctx.save();
		var shipPosInCameraSpace = worldPointToCameraSpace(ship.x,ship.y,camera); //get ship's position in camera space
		ctx.translate(shipPosInCameraSpace[0],shipPosInCameraSpace[1]); //translate to camera space position
		ctx.rotate((ship.rotation-camera.rotation) * (Math.PI / 180)); //rotate by difference in rotations
		ctx.scale(camera.zoom,camera.zoom); //scale by zoom value

		//main thrusters
		//forward thrust
		if(ship.activeThrusters.main>0.01){
			ctx.save();				
			ctx.fillStyle = ship.thrusterColor;
			ctx.beginPath();
			ctx.moveTo(-15,5);
			ctx.lineTo(-10,5);
			ctx.lineTo(-12.5,10+30*ship.activeThrusters.main/ship.thrusterEfficiency); //furthest point goes outward with thruster strength and scales inward with efficiency
			ctx.closePath();
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(15,5);
			ctx.lineTo(10,5);
			ctx.lineTo(12.5,10+30*ship.activeThrusters.main/ship.thrusterEfficiency);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}
		//backward thrust
		else if(ship.activeThrusters.main<-0.01){
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

		//rotational thrusters	
		//ccw
		if(ship.activeThrusters.side>0.01){
			ctx.save();				
			ctx.fillStyle = ship.thrusterColor;
			ctx.beginPath();
			ctx.moveTo(5,-10);
			ctx.lineTo(5,-15);
			ctx.lineTo(20+30*ship.activeThrusters.side/ship.thrusterEfficiency,-12.5);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}
		//cw
		else if(ship.activeThrusters.side<-0.01){
			ctx.save();				
			ctx.fillStyle = ship.thrusterColor;
			ctx.beginPath();
			ctx.moveTo(-5,-10);
			ctx.lineTo(-5,-15);
			ctx.lineTo(-20+30*ship.activeThrusters.side/ship.thrusterEfficiency,-12.5);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}

		//lateral thrusters
		//rightward
		if(ship.activeThrusters.lateral>0.01){
			ctx.save();				
			ctx.fillStyle = ship.thrusterColor;
			ctx.beginPath();
			ctx.moveTo(-10,0);
			ctx.lineTo(-10,-5);
			ctx.lineTo(-20-30*ship.activeThrusters.lateral/ship.thrusterEfficiency,-2.5);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}
		//leftward
		else if(ship.activeThrusters.lateral<-0.01){
			ctx.save();				
			ctx.fillStyle = ship.thrusterColor;
			ctx.beginPath();
			ctx.moveTo(10,0);
			ctx.lineTo(10,-5);
			ctx.lineTo(20-30*ship.activeThrusters.lateral/ship.thrusterEfficiency,-2.5);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}

		//the rest of the ship
		ctx.beginPath();
		ctx.moveTo(-20,10);
		ctx.lineTo(0,0);
		ctx.lineTo(20,10);
		ctx.lineTo(0,-30);
		ctx.closePath();
		ctx.fillStyle = ship.color;
		ctx.fill();
		ctx.restore();
	},
	updateShip: function(ship,dt){
		//initialize acceleration values
		var accelerationX = 0;
		var accelerationY = 0;
		var rotationalAcceleration = 0;

		//add acceleration from each thruster
		//medial
		var mainThrust = ship.activeThrusters.main;
		if(mainThrust){ //efficiency check
			var strength = mainThrust;

			//clamp thruster strength to the ship's max
			var maxStrength = ship.thrusterStrength;
			strength = Math.max(-maxStrength, Math.min(strength, maxStrength));
			ship.activeThrusters.main = strength; //this is purely for the visuals

			//create forward vector with strength value, rotate to ship's orientation, add components to acceleration values
			var baseAccel = [0,-strength];
			var rotatedAccel = rotate(0,0,baseAccel[0],baseAccel[1],-ship.rotation);
			accelerationX += rotatedAccel[0];
			accelerationY += rotatedAccel[1];
		}

		//lateral
		var latThrust = ship.activeThrusters.lateral;
		if(latThrust){ //effiency check
			var strength = latThrust;

			//clamp strength
			var maxStrength = ship.lateralThrusterStrength;
			strength = Math.max(-maxStrength, Math.min(strength, maxStrength));
			ship.activeThrusters.lateral = strength; //for visuals

			//create forward vector from strength, rotate to orientation plus 90, add copmponents to acceleration
			var baseAccel = [0,-strength];
			var rotatedAccel = rotate(0,0,baseAccel[0],baseAccel[1],-ship.rotation-90);
			accelerationX += rotatedAccel[0];
			accelerationY += rotatedAccel[1];
		}

		//rotational
		var rotThrust = ship.activeThrusters.side;
		if(rotThrust){ //effiency check
			var strength = rotThrust;

			//clamp strength
			var maxStrength = ship.sideThrusterStrength;
			strength = Math.max(-maxStrength, Math.min(strength, maxStrength));
			ship.activeThrusters.side = strength; //visuals

			//this one we can set directly
			rotationalAcceleration = -strength;
		}

		//accelerate
		ship.velocityX+=accelerationX*dt;
		ship.velocityY+=accelerationY*dt;
		ship.rotationalVelocity+=rotationalAcceleration*dt;

		//calculate velocity components for the stabilizers
		var rotatedForwardVector = rotate(0,0,0,1,-ship.rotation); //create forward vector, rotate to ship's orientation
		ship.medialVelocity = scalarComponentOf1InDirectionOf2(ship.velocityX,ship.velocityY,rotatedForwardVector[0],rotatedForwardVector[1]); //get magnitude of projection of velocity onto the vector
		rotatedForwardVector = rotate(0,0,0,1,-ship.rotation-90); //create forward vector, rotate to ship's orienation plus 90
		ship.lateralVelocity = scalarComponentOf1InDirectionOf2(ship.velocityX,ship.velocityY,rotatedForwardVector[0],rotatedForwardVector[1]); //et magnitude of velocity's projection onto the vector

		//move
		ship.x+=ship.velocityX*dt;
		ship.y+=ship.velocityY*dt;
		ship.rotation+=ship.rotationalVelocity*dt;
	},
	//clears the active thruster values
	shipClearThrusters:function(ship){
		ship.activeThrusters = {
			main: 0,
			side: 0,
			lateral: 0
		};
	},
	//add given strength to main thruster
	shipThrusters:function(ship, strength){
		ship.activeThrusters.main += strength;
	},
	//add strength to side thruster
	shipSideThrusters: function(ship, strength){
		ship.activeThrusters.side += strength;
	},
	//add strength to lateral thruster
	shipLateralThrusters:function(ship, strength){
		ship.activeThrusters.lateral += strength;
	},
	//rotational stabilizer
	shipRotationalStabilizers:function(ship){
		//if the side thruster isn't active, or is active in the opposite direction of our rotation
		if(ship.activeThrusters.side*ship.rotationalVelocity>=0)
			//add correctional strength in the opposite direction of our rotation
			this.shipSideThrusters(ship,ship.rotationalVelocity*ship.stabilizerStrength); //we check the direction because the stabilizers can apply more thrust than the player
		//or, if we've exceeded our clamp speed and are trying to keep accelerating in that direction
		else if (Math.abs(ship.rotationalVelocity)>=ship.thrusterClamps.side && ship.activeThrusters.side*ship.rotationalVelocity<0)
			//shut off the thruster
			ship.activeThrusters.side = 0;
	},
	//medial stabilizer
	shipMedialStabilizers:function(ship){
		//if the main thruster isn't active, or is working against our velocity
		if(ship.activeThrusters.main*ship.medialVelocity>=0)
			//add corrective strength
			this.shipThrusters(ship,ship.medialVelocity*ship.stabilizerStrength);
		//or, if we're past our clamp and trying to keep going
		else if (Math.abs(ship.medialVelocity)>=ship.thrusterClamps.main && ship.activeThrusters.main*ship.medialVelocity<0)
			//shut off the thruster
			ship.activeThrusters.main = 0;
	},
	//lateral stabilizer
	shipLateralStabilizers:function(ship){
		//see above
		if(ship.activeThrusters.lateral*ship.lateralVelocity>=0)
			this.shipLateralThrusters(ship,ship.lateralVelocity*ship.stabilizerStrength);
		else if (Math.abs(ship.lateralVelocity)>=ship.thrusterClamps.lateral && ship.activeThrusters.lateral*ship.lateralVelocity<0)
			ship.activeThrusters.lateral = 0;
	},
	shipFireLaser:function(ship){
		//if the cool down is up
		if(Date.now()>ship.lastLaserTime+ship.laserCD*1000){
			var laserVector = [0,-ship.laserRange];
			laserVector = rotate(0,0,laserVector[0],laserVector[1],-ship.rotation);
			this.createLaser(this.lasers,ship.x,ship.y,ship.x+laserVector[0],ship.y+laserVector[1],ship.laserColor,50);
		}
	},
	createLaser:function(lasers, startX,startY,endX,endY,color, power){
		lasers.push({
			startX:startX,
			startY:startY,
			endX:endX,
			endY:endY,
			color:color,
			power:power
		});
	},
	clearLasers:function(lasers){
		lasers.length = 0;
	},
	drawLasers:function(){

	},
	//draws asteroids from the given asteroids array to the given camera
	drawAsteroids: function(asteroids,camera, debug){
		var ctx = camera.ctx;
		asteroids.forEach(function(asteroid){
			ctx.save();
			var finalPosition = worldPointToCameraSpace(asteroid.x,asteroid.y,camera); //get asteroid's position in camera space
			ctx.translate(finalPosition[0],finalPosition[1]); //translate to that position
			ctx.scale(camera.zoom,camera.zoom); //scale to zoom
			ctx.beginPath();
			ctx.arc(0,0,asteroid.radius,0,Math.PI*2);
			ctx.fillStyle = asteroid.color;
			ctx.fill();
			ctx.restore();
		});
	},
	//the game loop
	update: function(){
		//queue our next frame
	 	this.animationID = requestAnimationFrame(this.update.bind(this));
	 	
	 	//pause screen
	 	if(this.paused){
	 		this.drawPauseScreen(this.camera);
	 		this.drawPauseScreen(this.worldCamera);
	 		return;
	 	}
	 	
	 	var dt = this.calculateDeltaTime(); //delta for physics
	 	
	 	//clear ship thruster values
		this.shipClearThrusters(this.ship);

		//set ship thruster values
	 	//assisted controls
		//medial motion
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_W])
			this.shipThrusters(this.ship,this.ship.thrusterStrength/3);
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_S])
			this.shipThrusters(this.ship,-this.ship.thrusterStrength/3);
		this.shipMedialStabilizers(this.ship);
		//lateral motion
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_Q])
			this.shipLateralThrusters(this.ship,-this.ship.lateralThrusterStrength/3);
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_E])
			this.shipLateralThrusters(this.ship,this.ship.lateralThrusterStrength/3);
		this.shipLateralStabilizers(this.ship);
		//rotational motion
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_A])
			this.shipSideThrusters(this.ship,this.ship.sideThrusterStrength/3);
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_D])
			this.shipSideThrusters(this.ship,-this.ship.sideThrusterStrength/3);
		this.shipRotationalStabilizers(this.ship);

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

		//camera zoom controls
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_UP])
			this.camera.zoom*=1.05;
		if(myKeys.keydown[myKeys.KEYBOARD.KEY_DOWN])
			this.camera.zoom*=.95;

	 	//update ship, center main camera on ship
		this.updateShip(this.ship,dt);
		this.camera.x = this.ship.x;
	 	this.camera.y = this.ship.y;
	 	this.camera.rotation = this.ship.rotation;

	 	//clear cameras
		this.clearCamera(this.camera);
		this.clearCamera(this.worldCamera);

		//draw grids then asteroids then ships
		this.drawGrid(this.camera);
		this.drawGrid(this.worldCamera);
		this.drawAsteroids(this.asteroids,this.camera);
		this.drawAsteroids(this.asteroids,this.worldCamera);
		this.drawShip(this.ship,this.camera);
		this.drawShip(this.ship,this.worldCamera);

		//FPS text
		if (this.debug){
			this.fillText(this.camera.ctx,'fps: '+1/dt,15,15,"10pt courier",'white');
		}

		//because we might use the frame count for something at some point
		this.frameCount++;
	},
	drawHUD: function(ctx){
		ctx.save(); // NEW
		
		ctx.restore(); // NEW
	},
	//draw pause screen in the given camera
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
		var now,fps;
		now = (Date.now().valueOf()); //get date as unix timestamp
		fps = 1000 / (now - this.lastTime);
		//fps = clamp(fps, 12, 60); //this literally makes this function useless for physics. just, why?
		this.lastTime = now; 
		return 1/fps;
	}    
}; // end app.main