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
	gameState:0,
	GAME_STATES:{
		TITLE:0,
		PLAYING:1,
		END:2
	},
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
		radius:20, //collision radius
		rotation:0,
		//velocities
		velocityX:0, //in absolute form, used for movement
		velocityY:0,
		rotationalVelocity:0,
		forwardVectorX:0,
		forwardVectorY:0,
		rightVectorX:0,
		rightVectorY:0,
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
		stabilizerThrustRatio:1.5,
		//used for controlling laser fire rate
		//lastLaserTime:0,
		laser:{
			lastFireTime:0,
			cd:.1,
			range:5000,
			color:'cyan',
			currentPower:0,
			coherence:.9,
			maxPower:1000,
			efficiency:500
		},
		stabilizersEnabled:true,
		//per-frame thruster strengths
		activeThrusters:{
			main:0,
			lateral:0,
			side:0
		},
		//maximum velocities in each direction
		//thrusters will not be used to accelerate past these values
		thrusterClamps:{
			main:3000,
			lateral: 2000,
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
	starCamera:{
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
		gridStart: [-125000,-125000] //corner anchor in world coordinates
	},
	asteroids:[],
	stars:[],
	baseStarCameraZoom:.0001,
    // methods
	init : function() {
		// initialize properties
		var canvas = document.querySelector('#canvas1');
		//canvas.onmousedown = this.doMousedown.bind(this);
		//var canvas2 = document.querySelector('#canvas2');
		//canvas2.onmousedown = this.doMousedown.bind(this);
		this.camera = this.initializeCamera(canvas,0,0,0,.5);
		this.starCamera = this.initializeCamera(canvas, 0, 0,0,.0001);
		this.makeAsteroids.bind(this)();
		this.generateStarField.bind(this)();
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
		ctx.globalAlpha = .8;
		ctx.strokeWidth = 5;
		ctx.strokeStyle = 'darkblue';
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
				hp:500,
				color:'saddlebrown'
			},
			{
				x:400,
				y:100,
				radius:50,
				hp:500,
				color:'saddlebrown'
			},
			{
				x:350,
				y:400,
				radius:50,
				hp:500,
				color:'saddlebrown'
			}
		];
	},
	generateStarField:function(){
		var lower = -10000000;
		var upper = 10000000;
		var maxRadius = 8000;
		var minRadius = 2000;
		for(var c=0;c<500;c++){
			var colorValue = Math.round(Math.random()*200+55);
			this.stars.push({
				x: Math.random()*(upper-lower)+lower,
				y: Math.random()*(upper-lower)+lower,
				radius: Math.random()*(maxRadius-minRadius)+minRadius,
				color:'rgb('+colorValue+','+colorValue+','+colorValue+')'
			});
		}
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

		var normalizedForwardVector = rotate(0,0,0,-1,-ship.rotation);
		var normalizedRightVector = rotate(0,0,0,-1,-ship.rotation-90);
		ship.forwardVectorX = normalizedForwardVector[0],
		ship.forwardVectorY = normalizedForwardVector[1];
		ship.rightVectorX = normalizedRightVector[0];
		ship.rightVectorY = normalizedRightVector[1];

		//add acceleration from each thruster
		//medial
		var mainThrust = ship.activeThrusters.main;
		if(mainThrust){ //efficiency check
			var strength = mainThrust;

			//clamp thruster strength to the ship's max
			var maxStrength = ship.thrusterStrength;
			strength = Math.max(-maxStrength, Math.min(strength, maxStrength));
			ship.activeThrusters.main = strength; //this is purely for the visuals

			//add forward vector times strength to acceleration
			accelerationX += normalizedForwardVector[0]*strength;
			accelerationY += normalizedForwardVector[1]*strength;
		}

		//lateral
		var latThrust = ship.activeThrusters.lateral;
		if(latThrust){ //effiency check
			var strength = latThrust;

			//clamp strength
			var maxStrength = ship.lateralThrusterStrength;
			strength = Math.max(-maxStrength, Math.min(strength, maxStrength));
			ship.activeThrusters.lateral = strength; //for visuals

			//add right vector times strength to acceleration
			accelerationX += normalizedRightVector[0]*strength;
			accelerationY += normalizedRightVector[1]*strength;
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
		ship.medialVelocity = -scalarComponentOf1InDirectionOf2(ship.velocityX,ship.velocityY,normalizedForwardVector[0],normalizedForwardVector[1]); //get magnitude of projection of velocity onto the forward vector
		ship.lateralVelocity = -scalarComponentOf1InDirectionOf2(ship.velocityX,ship.velocityY,normalizedRightVector[0],normalizedRightVector[1]); //et magnitude of velocity's projection onto the right vector

		//move
		ship.x+=ship.velocityX*dt;
		ship.y+=ship.velocityY*dt;
		ship.rotation+=ship.rotationalVelocity*dt;

		//create laser objects
		if(ship.laser.currentPower>0){
			var laserVector = [0,-ship.laser.range];
			laserVector = rotate(0,0,laserVector[0],laserVector[1],-ship.rotation);
			this.createLaser(this.lasers,ship.x+normalizedForwardVector[0],ship.y+normalizedForwardVector[1],ship.x+laserVector[0],ship.y+laserVector[1],ship.laser.color,ship.laser.currentPower);
			ship.laser.currentPower-=ship.laser.maxPower*(1-ship.laser.coherence)*dt*1000;
		}
		else if(ship.laser.currentPower<0)
			ship.laser.currentPower=0;
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
		var now = Date.now();
		//if the cool down is up
		if(now>ship.laser.lastFireTime+ship.laser.cd*1000){
			ship.laser.lastFireTime = now;
			ship.laser.currentPower = ship.laser.maxPower;			
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
		lasers.length=0;
	},
	checkCollisions:function(dt){
		var asteroids = this.asteroids;
		this.lasers.forEach(function(laser){
			var obj; //the chosen object
			var tValOfObj = Number.MAX_VALUE;
			var xInv = laser.endX<laser.startX;
			var yInv = laser.endY<laser.startY;
			var start = [(xInv) ? laser.endX : laser.startX, (yInv) ? laser.endY : laser.startY];
			var end = [(xInv) ? laser.startX : laser.endX, (yInv) ? laser.startY : laser.endY];
			for(var c = 0;c<asteroids.length;c++){
				var thisObj = asteroids[c];
				if(thisObj.x + thisObj.radius<start[0] || thisObj.x-thisObj.radius>end[0] || thisObj.y + thisObj.radius<start[1] || thisObj.y-thisObj.radius>end[1])
					continue;
				var thisDistance = distanceFromPointToLine(thisObj.x,thisObj.y,laser.startX,laser.startY,laser.endX,laser.endY);
				if(thisDistance[0]<thisObj.radius && thisDistance[1]<tValOfObj){
					obj = thisObj;
					tValOfObj = thisDistance[1];
				}
			}
			if(obj)
			{
				obj.hp-=laser.power*dt;
				console.log(obj+' hp: '+obj.hp);
				var laserDir = [laser.endX-laser.startX,laser.endY-laser.startY];
				var newEnd = [laser.startX+tValOfObj*laserDir[0],laser.startY+tValOfObj*laserDir[1]];
				laser.endX = newEnd[0];
				laser.endY = newEnd[1];
			}
		});
	},
	drawLasers:function(lasers,camera){
		var ctx = camera.ctx;
		lasers.forEach(function(laser){
			var start = worldPointToCameraSpace(laser.startX,laser.startY,camera);
			var end = worldPointToCameraSpace(laser.endX,laser.endY,camera);
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(start[0],start[1]);
			ctx.lineTo(end[0],end[1]);
			//ctx.closePath();
			//ctx.globalAlpha = 
			ctx.strokeStyle = laser.color;
			ctx.lineCap = 'round';
			ctx.lineWidth = (laser.power/laser.efficiency)*camera.zoom;
			ctx.stroke();
			ctx.restore();
		});
	},
	clearAsteroids:function(asteroids){
		for(var c = 0;c<asteroids.length;c++){
			if(asteroids[c].hp<=0)
				asteroids.splice(c--,1);
		}
	},
	//draws asteroids from the given asteroids array to the given camera
	drawAsteroids: function(asteroids,camera){
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
	//draws asteroids from the given asteroids array to the given camera
	drawStars: function(stars,camera){
		var ctx = camera.ctx;
		stars.forEach(function(star){
			ctx.save();
			var finalPosition = worldPointToCameraSpace(star.x,star.y,camera); //get asteroid's position in camera space
			ctx.translate(finalPosition[0],finalPosition[1]); //translate to that position
			ctx.scale(camera.zoom,camera.zoom); //scale to zoom
			ctx.beginPath();
			ctx.arc(0,0,star.radius,0,Math.PI*2);
			ctx.globalAlpha = .5;
			ctx.fillStyle = star.color;
			ctx.fill();
			ctx.restore();
		});
	},
	//the game loop
	update: function(){
		//queue our next frame
	 	this.animationID = requestAnimationFrame(this.update.bind(this));
	 	
	 	//pause screen
	 	if(this.gameState == this.GAME_STATES.PLAYING && this.paused){
	 		this.drawPauseScreen(this.camera);
	 		//this.drawPauseScreen(this.worldCamera);
	 		return;
	 	}
	 	
	 	var dt = this.calculateDeltaTime(); //delta for physics

	 	//clear values
		this.clearLasers(this.lasers);
		this.shipClearThrusters(this.ship);
		this.clearAsteroids(this.asteroids);

		if(this.asteroids.length==0 && this.gameState==this.GAME_STATES.PLAYING)
			this.gameState = this.GAME_STATES.END;
		else if(this.gameState == this.GAME_STATES.PLAYING){

			//set ship thruster values
		 	//assisted controls
			//medial motion
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_W])
				this.shipThrusters(this.ship,this.ship.thrusterStrength/this.ship.stabilizerThrustRatio);
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_S])
				this.shipThrusters(this.ship,-this.ship.thrusterStrength/this.ship.stabilizerThrustRatio);
			if(this.ship.stabilizersEnabled)
				this.shipMedialStabilizers(this.ship);
			//lateral motion
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_Q])
				this.shipLateralThrusters(this.ship,-this.ship.lateralThrusterStrength/this.ship.stabilizerThrustRatio);
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_E])
				this.shipLateralThrusters(this.ship,this.ship.lateralThrusterStrength/this.ship.stabilizerThrustRatio);
			if(this.ship.stabilizersEnabled)
				this.shipLateralStabilizers(this.ship);
			//rotational motion
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_A])
				this.shipSideThrusters(this.ship,this.ship.sideThrusterStrength/this.ship.stabilizerThrustRatio);
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_D])
				this.shipSideThrusters(this.ship,-this.ship.sideThrusterStrength/this.ship.stabilizerThrustRatio);
			if(this.ship.stabilizersEnabled)
				this.shipRotationalStabilizers(this.ship);
			//lasers
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_SPACE])
				this.shipFireLaser(this.ship);

		 	//camera zoom controls
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_UP])
				this.camera.zoom*=1.05;
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_DOWN])
				this.camera.zoom*=.95;	 

		 	//update ship, center main camera on ship
			this.updateShip(this.ship,dt);
			

			this.checkCollisions(dt);

				
		}
		else if(this.gameState == this.GAME_STATES.TITLE && myKeys.keydown[myKeys.KEYBOARD.KEY_W])
			this.gameState = this.GAME_STATES.PLAYING;

	 	
		this.camera.x = this.ship.x;// this.ship.forwardVectorX*(this.camera.height/6)*(1/this.camera.zoom);
		this.camera.y = this.ship.y;// this.ship.forwardVectorY*(this.camera.height/6)*(1/this.camera.zoom);
		this.camera.rotation = this.ship.rotation;
		this.starCamera.x = this.camera.x;
	 	this.starCamera.y = this.camera.y;
	 	this.starCamera.rotation = this.camera.rotation;
	 	//this.starCamera.zoom = this.camera.zoom*this.baseStarCameraZoom;
		//clear cameras
		this.clearCamera(this.camera);
		this.clearCamera(this.starCamera);
		//draw grids then asteroids then ships
		this.drawStars(this.stars,this.starCamera);
		this.drawGrid(this.camera);
		this.drawLasers(this.lasers, this.camera);
		this.drawAsteroids(this.asteroids,this.camera);
		if(this.gameState == this.GAME_STATES.PLAYING)
		{
			this.drawShip(this.ship,this.camera);
			this.drawHUD(this.camera);
		}
		else if(this.gameState == this.GAME_STATES.TITLE)
		{
			this.drawTitleScreen(this.camera);
		}
		else if(this.gameState == this.GAME_STATES.END){
			this.drawEndScreen(this.camera);
		}

		//FPS text
		if (this.debug){
			this.fillText(this.camera.ctx,'fps: '+1/dt,15,15,"10pt courier",'white');
		}

		//because we might use the frame count for something at some point
		this.frameCount++;
	},
	drawHUD: function(camera){
		var ctx = camera.ctx;
		ctx.save(); // NEW
		ctx.textAlign = 'left';
		ctx.textBaseline = 'center';
		this.fillText(ctx, "Control mode: "+((this.ship.stabilizersEnabled)?'assisted':'manual'),camera.width/15,9*camera.height/10,"12pt courier",'white')
		ctx.restore(); // NEW
	},
	drawTitleScreen:function(camera){
		var ctx = camera.ctx;
		ctx.save();
		ctx.fillStyle = 'black';
		ctx.globalAlpha = .5;
		ctx.fillRect(0,0,camera.width,camera.height);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.globalAlpha = 1;
		this.fillText(ctx,"Space Battle With Lasers",camera.width/2,camera.height/5,"24pt courier",'white');
		this.fillText(ctx,"Press W to start",camera.width/2,4*camera.height/5,"12pt courier",'white');
		ctx.restore();
	},
	drawEndScreen:function(camera){
		var ctx = camera.ctx;
		ctx.save();
		ctx.fillStyle = 'black';
		ctx.globalAlpha = .5;
		ctx.fillRect(0,0,camera.width,camera.height);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.globalAlpha = 1;
		this.fillText(ctx,"You win!",camera.width/2,camera.height/5,"24pt courier",'white');
		this.fillText(ctx,"Good for you",camera.width/2,4*camera.height/5,"12pt courier",'white');
		ctx.restore();		
	},
	//draw pause screen in the given camera
	drawPauseScreen:function(camera){
		var ctx = camera.ctx;
		ctx.save();
		ctx.fillStyle = "black",
		ctx.globalAlpha = .03;
		ctx.fillRect(0,0,camera.width,camera.height);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.globalAlpha = 1;
		this.fillText(ctx,"Paused",camera.width/2,camera.height/5,"24pt courier",'white');
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