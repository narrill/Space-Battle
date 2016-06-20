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
	canvas: undefined,
	minimapCanvas: undefined,
	accumulator:0,
	timeStep:.005,
	updatesPerDraw:0,
	drawStarField:true,
	thrusterSound:undefined,
	soundLevel:2.5,
	thrusterDetail:2,
	laserDetail:3,
	gameState:0,
	GAME_STATES:{
		TITLE:0,
		PLAYING:1,
		WIN:2,
		LOSE:3,
		MENU:4,
		TUTORIAL:5
	},
	SHIP_COMPONENTS:{
		THRUSTERS:0,
		LASERS:1,
		SHIELDS:2,
		CANNON:3
	},
   	lastTime: 0, // used by calculateDeltaTime() 
    debug: true,
	paused:false,
	animationID:0,
	frameCount:0,
	runningTime:0,
	ship:{},
	otherShips:[],
	otherShipCount:0,
	maxOtherShips:10,
	lasers:[],
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

    //initialize the stuff
	init : function() {
		// initialize properties
			var canvas = this.canvas = document.querySelector('#canvas1');
			this.generateStarField.bind(this, this.stars)();
			this.ship = this.createShip({},this.grid);
			this.camera = this.createCamera(canvas,{x:this.ship.x,y:this.ship.y,rotation:this.ship.rotation,zoom:.5,minZoom:.025,maxZoom:5});
			this.camera.globalCompositeOperation = 'hard-light';
			this.starCamera = this.createCamera(canvas);
			this.gridCamera = this.createCamera(canvas);
			this.minimapCamera = this.createCamera(canvas,{x:this.grid.gridStart[0]+this.grid.gridLines*this.grid.gridSpacing/2,y:this.grid.gridStart[1]+this.grid.gridLines*this.grid.gridSpacing/2,zoom:.001,viewport:{startX:.83,startY:.7,endX:1,endY:1}});

		// start the game loop		
			this.lastTime = Date.now();
			this.animationID = requestAnimationFrame(this.frame.bind(this));
	},

	//resets the game state
	resetGame:function(){
		this.clearProjectiles(this.projectiles);
		this.ship = {};
		this.ship = this.createShip({},this.grid);
		this.makeAsteroids.bind(this,this.asteroids,this.grid)();
		this.otherShips = [];
		this.otherShipCount = 1;
		for(var c = 0;c<this.otherShipCount;c++)
		{
			this.otherShips.push(this.createShip({},this.grid));
			this.otherShips[c].ai = this.createComponentShipAI();
		}
		this.gameState = this.GAME_STATES.PLAYING;
		this.frameCount = 0;
	},

	//returns a random position within the given grid
	randomGridPosition:function(grid){
		var lower = [grid.gridStart[0],grid.gridStart[1]];
		var upper = [lower[0]+grid.gridLines*grid.gridSpacing,lower[1]+grid.gridLines*grid.gridSpacing];
		return {
			//position/rotation
			x: Math.random() * (upper[0] - lower[0]) + lower[0],
			y: Math.random() * (upper[1] - lower[1]) + lower[1]
		};
	},

	//returns a bool indicating whether the given position is within the given grid plus tolerances (in pixels)
	isPositionInGrid: function(position, grid, tolerances){
		if(!tolerances)
			tolerances = [0,0];
		var lower = [grid.gridStart[0],grid.gridStart[1]];
		var upper = [lower[0]+grid.gridLines*grid.gridSpacing,lower[1]+grid.gridLines*grid.gridSpacing];

		return position[0] > lower[0] - tolerances[0] && position[0] < upper[0] + tolerances[0] && position[1] > lower[1] - tolerances[1] && position[1] < upper[1] + tolerances[1];
	},

	//returns a camera object with the given values and the context from the given canvas
	createCamera:function(canvas, objectParams){
		if(!objectParams)
			objectParams = {};
		return {
			x:(objectParams.x) ? objectParams.x : 0,
			y:(objectParams.y) ? objectParams.y : 0,
			rotation:(objectParams.rotation) ? objectParams.rotation : 0,
			zoom: (objectParams.zoom) ? objectParams.zoom : 1,
			minZoom:(objectParams.minZoom)?objectParams.minZoom:0,
			maxZoom:(objectParams.maxZoom)?objectParams.maxZoom:Number.MAX_VALUE,
			viewport:this.createComponentViewport(objectParams.viewport),
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
		ctx.fill();
	},

	//constructor for ship objects
	createShip:function(objectParams, grid){
		var gridPosition = this.randomGridPosition(grid);
		return {
			//position/rotation
			x:(objectParams.x)?objectParams.x : gridPosition.x,
			y:(objectParams.x)?objectParams.y : gridPosition.y,
			rotation:(objectParams.rotation)?objectParams.rotation : 0,
			prevX: (objectParams.x)?objectParams.x : gridPosition.x,
			prevY: (objectParams.x)?objectParams.y : gridPosition.y,
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
			destructible:this.createComponentDestructible((objectParams.destructible)?objectParams.destructible : {
				hp:100,
				radius:25,
				shield:{
					max:100,
					recharge:3,
					efficiency:8
				}
			}),
			thrusters:this.createComponentThrusterSystem(objectParams.thrusters),
			stabilizer:this.createComponentStabilizer(objectParams.stabilizer),
			powerSystem:this.createComponentPowerSystem(objectParams.powerSystem),
			//colors
			color:(objectParams.color)?objectParams.color : getRandomBrightColor(),
			//used for controlling laser fire rate
			//lastLaserTime:0,
			laser:this.createComponentLaser((objectParams.laser)),
			cannon:this.createComponentCannon(objectParams.cannon)
		};
	},

	//constructor for the thruster system component
	createComponentThrusterSystem:function(objectParams){
		if(!objectParams)
			objectParams = {};
		return {
			color:(objectParams.color)? objectParams.color: getRandomBrightColor(),
			noiseLevel:0,
			medial:this.createComponentThruster((objectParams.medial)?objectParams.medial:{
				maxStrength:3000,
				efficiency:1000
			}),
			lateral:this.createComponentThruster((objectParams.lateral)?objectParams.lateral:{
				maxStrength:2000,
				efficiency:1000
			}),
			rotational:this.createComponentThruster((objectParams.rotational)?objectParams.rotational:{
				maxStrength:750,
				efficiency:1000
			})
		};
	},

	//constructor for the thruster component
	createComponentThruster:function(objectParams){
		if(!objectParams)
			objectParams = {};
		return {
			currentStrength:0,
			targetStrength:0,
			maxStrength: (objectParams.maxStrength)?objectParams.maxStrength:1000,
			efficiency: (objectParams.efficiency) ? objectParams.efficiency:1000,
			powerRampPercentage: (objectParams.powerRampPercentage)? objectParams.powerRampPercentage: 20,
			powerRampLimit: (objectParams.powerRampLimit) ? objectParams.powerRampLimit : 6000
		};
	},

	//constructor for the power system component
	createComponentPowerSystem:function(objectParams){
		if(!objectParams)
			objectParams = {};
		return{
			current:[0,0,0],
			target:[0,0,0],
			transferRate:6
		};
	},

	//constructor for the stabilizer component
	createComponentStabilizer:function(objectParams){
		if(!objectParams)
			objectParams = {};
		return{
			enabled: (objectParams.enabled)? objectParams.enabled:true,
			strength: (objectParams.strength)? objectParams.strength:1200,
			thrustRatio: (objectParams.thrustRatio)?objectParams.thrustRatio:1.5,
			precision: (objectParams.precision) ? objectParams.precision : 30,
			clamps: this.createComponentStabilizerClamps(objectParams.clamps)
		};
	},

	//constructor for the stabilizer clamps sub-component
	createComponentStabilizerClamps:function(objectParams){
		if(!objectParams)
			objectParams = {};
		return{
			enabled: (objectParams.enabled)? objectParams.enabled:true,
			medial:(objectParams.medial)?objectParams.medial:3000,
			lateral:(objectParams.lateral)?objectParams.lateral:2000,
			rotational:(objectParams.rotational)?objectParams.rotational:90
		};
	},

	//constructor for the laser component
	createComponentLaser:function(objectParams){
		if(!objectParams)
			objectParams = {};
		return{
			lastFireTime:0,
			cd:(objectParams.cd)?objectParams.cd:.3,
			range:(objectParams.range)?objectParams.range:10000,
			color:(objectParams.color)?objectParams.color:getRandomBrightColor(),
			currentPower:0,
			coherence:(objectParams.coherence)?objectParams.coherence:.995,
			maxPower:(objectParams.maxPower)?objectParams.maxPower:6000,
			efficiency:(objectParams.efficiency)?objectParams.efficiency:200,
			spread:(objectParams.spread)?objectParams.spread:0
		};
	},

	//constructor for cannon component
	createComponentCannon:function(objectParams){
		if(!objectParams)
			objectParams = {};
		return{
			firing:false,
			lastFireTime:0,
			cd:(objectParams.cd)?objectParams.cd:.02,
			power:(objectParams.power)?objectParams.power:24000,

		};
	},

	//constructor for the destructible component - stores hp, shields, and collider radius
	createComponentDestructible:function(objectParams){
		if(!objectParams)
			objectParams = {};
		return{
			hp:(objectParams.hp)?objectParams.hp:500,
			maxHp: (objectParams.hp)?objectParams.hp:500,
			radius:(objectParams.radius)?objectParams.radius:500,
			shield:this.createComponentDestructibleShield(objectParams.shield),
		};
	},

	//constructor for the shield sub-component
	createComponentDestructibleShield:function(objectParams){
		if(!objectParams)
			objectParams = {};
		return{
			current:(objectParams.max)?objectParams.max:0,
			max:(objectParams.max)?objectParams.max:0,
			efficiency:(objectParams.efficiency)?objectParams.efficiency:0,
			recharge:(objectParams.recharge)?objectParams.recharge:0
		};
	},

	//constructor for the AI component
	createComponentShipAI:function(objectParams){
		if(!objectParams)
			objectParams = {};
		return{
			followMin:(objectParams.followMin)?objectParams.followMin:2500,
			followMax:(objectParams.followMax)?objectParams.followMax:3000,
			accuracy:.5,
			fireSpread:5
		};
	},

	//constructor for viewport component
	createComponentViewport:function(objectParams){
		if(!objectParams)
			objectParams = {};
		return{
			startX:(objectParams.startX)?objectParams.startX:0,
			startY:(objectParams.startY)?objectParams.startY:0,
			endX:(objectParams.endX)?objectParams.endX:1,
			endY:(objectParams.endY)?objectParams.endY:1
		};
	},

	//constructor for laser object
	createLaser:function(lasers, startX,startY,endX,endY,color, power,efficiency, previousLaser, owner){
		var lsr = {
			startX:startX,
			startY:startY,
			endX:endX,
			endY:endY,
			color:color,
			power:power,
			efficiency:efficiency,
			previousLaser:previousLaser,
			owner:owner
		};
		lasers.push(lsr);
		return lsr;
	},

	//constructor for projectile object
	createProjectile:function(projectiles, startX, startY, velX, velY, destructible, color, owner){
		var prj = {
			x:startX,
			y:startY,
			prevX:startX,
			prevY:startY,
			velocityX:velX,
			velocityY:velY,
			destructible:destructible,
			color:color,
			owner:owner
		};
		projectiles.push(prj);
	},

	//scales target values of the given power system such that they sum to 1
	scalePowerTarget:function(ps){
		var sum = 0;
		for(var c = 0;c<ps.target.length;c++)
		{
			sum+=ps.target[c];
		}
		if(sum==0)
		{
			ps.target = [0,0,0];
			return;
		}
		for(var c = 0;c<ps.target.length;c++)
			ps.target[c] = ps.target[c]/sum;
	},

	//returns the current value of the given component ID (from component enum) in the given power system after applying a transformation function
	getPowerForComponent:function(ps,component){
		if(component>=ps.current.length || component<0)
			return 0;
		var components = ps.current.length;
		return clamp(0,(ps.current[component]-(1/components))/(2*(1/components)),1); //this is the transformation function
	},

	//draws the grid in the given camera
	drawGrid:function(camera, minimap){
		var ctx = camera.ctx;
		var gridLines = this.grid.gridLines;
		var gridSpacing = this.grid.gridSpacing;
		var gridStart = this.grid.gridStart;

		for(var c = 0;c<this.grid.colors.length;c++){	
			if(minimap && !this.grid.colors[c].minimap)
				continue;		
			ctx.save();
			ctx.beginPath();
			for(var x = 0;x<=gridLines;x++){
				if(x%this.grid.colors[c].interval != 0)
						continue;
				var correctInterval = true;
				for(var n = 0;n<c;n++)
				{
					if(x%this.grid.colors[n].interval == 0 && (!minimap || this.grid.colors[n].minimap))
					{
						correctInterval = false;
						break;
					}
				}
				if(correctInterval!=true)
					continue;
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
				if(y%this.grid.colors[c].interval != 0)
						continue;
				var correctInterval = true;
				for(var n = 0;n<c;n++)
				{
					if(y%this.grid.colors[n].interval == 0 && (!minimap || this.grid.colors[n].minimap))
					{
						correctInterval = false;
						break;
					}
				}
				if(correctInterval!=true)
					continue;
				//same as above, but perpendicular
				var start = [gridStart[0],gridStart[0]+y*gridSpacing];
				var end = [gridStart[0]+gridLines*gridSpacing,start[1]];
				start = worldPointToCameraSpace(start[0],start[1],camera);
				end = worldPointToCameraSpace(end[0],end[1],camera);
				ctx.moveTo(start[0],start[1]);
				ctx.lineTo(end[0],end[1]);
			}
			//draw all lines, stroke last
			ctx.globalAlpha = .3;
			ctx.strokeWidth = 5;
			ctx.strokeStyle = this.grid.colors[c].color;
			ctx.stroke();
			ctx.restore();
		}
	},

	//generates the field of asteroids
	makeAsteroids:function(asteroids, grid){
		var lower = [grid.gridStart[0],grid.gridStart[1]];
		var upper = [lower[0]+grid.gridLines*grid.gridSpacing,lower[1]+grid.gridLines*grid.gridSpacing];
		var maxRadius = 3000;
		var minRadius = 1000;
		//asteroids.objs = [];
		for(var c=asteroids.objs.length;c<asteroids.total;c++){
			var radius = Math.random()*(maxRadius-minRadius)+minRadius;
			var group = Math.floor(Math.random()*this.asteroids.colors.length);
			asteroids.objs.push({
				x: Math.random()*(upper[0]-lower[0])+lower[0],
				y: Math.random()*(upper[1]-lower[1])+lower[1],
				radius:radius, //graphical radius
				destructible:this.createComponentDestructible({
					hp:radius*radius/1000,
					radius:radius //collider radius
				}),
				colorIndex:group
			});
		}
	},

	//generates a field of stars - same as above, but without the destructibles
	generateStarField:function(stars){
		var lower = -10000000;
		var upper = 10000000;
		var maxRadius = 8000;
		var minRadius = 2000;
		for(var c=0;c<500;c++){
			var group = Math.floor(Math.random()*this.stars.colors.length);
			stars.objs.push({
				x: Math.random()*(upper-lower)+lower,
				y: Math.random()*(upper-lower)+lower,
				radius: Math.random()*(maxRadius-minRadius)+minRadius,
				colorIndex:group
			});
		}
	},

	//advances a projectile according to its velocity
	updateProjectile: function(prj, dt){
		prj.prevX = prj.x;
		prj.prevY = prj.y;
		prj.x += prj.velocityX * dt;
		prj.y += prj.velocityY * dt;
	},

	//advances the given ship forward in time by dT
	updateShip: function(ship,dt){
		//store position at previous update for swept area construction
			ship.prevX = ship.x;
			ship.prevY = ship.y;

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
				var strength = ship.thrusters.medial.targetStrength;

				//clamp target strength to the thruster's max
					var maxStrength = ship.thrusters.medial.maxStrength;
					strength = clamp(-maxStrength,strength,maxStrength);
				//lerp current thruster strength to target strength at the power ramp rate, then set current strength and the target strength to the lerped value
					var thrusterDelta = lerp(ship.thrusters.medial.currentStrength,strength,ship.thrusters.medial.powerRampPercentage*dt) - ship.thrusters.medial.currentStrength;
					if(thrusterDelta * ship.thrusters.medial.currentStrength > 0)
						thrusterDelta = clamp(-ship.thrusters.medial.powerRampLimit * dt, thrusterDelta, ship.thrusters.medial.powerRampLimit * dt);
					strength = ship.thrusters.medial.currentStrength = ship.thrusters.medial.currentStrength + thrusterDelta;
					strength = clamp(-maxStrength,strength,maxStrength); //this is in case of really low dt values

				//add forward vector times strength to acceleration
					accelerationX += normalizedForwardVector[0]*strength;
					accelerationY += normalizedForwardVector[1]*strength;

			//lateral
				var strength = ship.thrusters.lateral.targetStrength;

				//clamp strength
					var maxStrength = ship.thrusters.lateral.maxStrength;
					strength = clamp(-maxStrength,strength,maxStrength);
				//lerp current thruster strength to target strength at the power ramp rate, then set current strength and the target strength to the lerped value
					var thrusterDelta = lerp(ship.thrusters.lateral.currentStrength,strength,ship.thrusters.lateral.powerRampPercentage*dt) - ship.thrusters.lateral.currentStrength;
					if(thrusterDelta * ship.thrusters.lateral.currentStrength > 0)
						thrusterDelta = clamp(-ship.thrusters.lateral.powerRampLimit * dt, thrusterDelta, ship.thrusters.lateral.powerRampLimit * dt);
					strength = ship.thrusters.lateral.currentStrength = ship.thrusters.lateral.currentStrength + thrusterDelta;
					strength = clamp(-maxStrength,strength,maxStrength);

				//add right vector times strength to acceleration
					accelerationX += normalizedRightVector[0]*strength;
					accelerationY += normalizedRightVector[1]*strength;

			//rotational
				var strength = ship.thrusters.rotational.targetStrength;

				//clamp strength
					var maxStrength = ship.thrusters.rotational.maxStrength;
					strength = clamp(-maxStrength,strength,maxStrength);
				//lerp current thruster strength to target strength at the power ramp rate, then set current strength and the target strength to the lerped value
					var thrusterDelta = lerp(ship.thrusters.rotational.currentStrength,strength,ship.thrusters.rotational.powerRampPercentage*dt) - ship.thrusters.rotational.currentStrength;
					if(thrusterDelta * ship.thrusters.rotational.currentStrength > 0)
						thrusterDelta = clamp(-ship.thrusters.rotational.powerRampLimit * dt, thrusterDelta, ship.thrusters.rotational.powerRampLimit * dt);
					strength = ship.thrusters.rotational.currentStrength = ship.thrusters.rotational.currentStrength + thrusterDelta;
					strength = clamp(-maxStrength,strength,maxStrength);

				//this one we can set directly
					rotationalAcceleration = -strength;

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
			if(ship.rotation>180)
				ship.rotation-=360;
			else if(ship.rotation<-180)
				ship.rotation+=360;

		//create laser objects
			var laserVector = [0,-ship.laser.range];
			laserVector = rotate(0,0,laserVector[0],laserVector[1],-ship.rotation+Math.random()*ship.laser.spread-ship.laser.spread/2);
			if(ship.laser.previousLaser)
				ship.laser.previousLaser.previousLaser = null; //avoiding a memory leak - without this the lasers will chain backwards in time continuously
			ship.laser.previousLaser = this.createLaser(this.lasers,ship.x+normalizedForwardVector[0]*(30),ship.y+normalizedForwardVector[1]*30,ship.x+laserVector[0],ship.y+laserVector[1],ship.laser.color,ship.laser.currentPower, ship.laser.efficiency, ship.laser.previousLaser, ship);
			ship.laser.currentPower-=ship.laser.maxPower*(1-ship.laser.coherence)*dt*1000;
			if(ship.laser.currentPower<0)
				ship.laser.currentPower=0;

		//create projectiles
			if(ship.cannon.firing){
				var prjVelocity = [ship.forwardVectorX * ship.cannon.power, ship.forwardVectorY * ship.cannon.power];
				var prjDestructible = {
					hp:.1,
					radius:.5
				};
				this.createProjectile(this.projectiles, ship.x+normalizedForwardVector[0]*(30), ship.y+normalizedForwardVector[1]*30, prjVelocity[0] + ship.velocityX, prjVelocity[1] + ship.velocityY, this.createComponentDestructible(prjDestructible), 'yellow', ship);
				ship.cannon.firing = false;
			}

		//refresh shields
			if(ship.destructible.shield.current<ship.destructible.shield.max)
			{
				ship.destructible.shield.current+=ship.destructible.shield.recharge*dt;
				if(ship.destructible.shield.current>ship.destructible.shield.max)
					ship.destructible.shield.current = ship.destructible.shield.max;
			}

		//update power system
			//scale all relevant values down from the augmented to their normal using the old power values
				var thrusterPower = this.getPowerForComponent(ship.powerSystem, this.SHIP_COMPONENTS.THRUSTERS);
				var laserPower = this.getPowerForComponent(ship.powerSystem, this.SHIP_COMPONENTS.LASERS);
				var shieldPower = this.getPowerForComponent(ship.powerSystem, this.SHIP_COMPONENTS.SHIELDS);
				//thrusters
					ship.thrusters.medial.maxStrength/=(1+thrusterPower);
					ship.thrusters.lateral.maxStrength/=(1+thrusterPower);
					ship.thrusters.rotational.maxStrength/=(1+thrusterPower);
					ship.stabilizer.clamps.medial/=(1+thrusterPower);
					ship.stabilizer.clamps.lateral/=(1+thrusterPower);
					ship.stabilizer.clamps.rotational/=(1+thrusterPower);
				//lasers
					ship.laser.maxPower/=(1+laserPower);
				//shields
					ship.destructible.shield.current/=(1+shieldPower);
					ship.destructible.shield.max/=(1+shieldPower);
					ship.destructible.shield.recharge/=(1+shieldPower);

			//update the power values
				this.scalePowerTarget(ship.powerSystem);
				ship.powerSystem.current = lerpNd(ship.powerSystem.current,ship.powerSystem.target,ship.powerSystem.transferRate*dt);

			//scale back up to augmented with the new power values
				thrusterPower = this.getPowerForComponent(ship.powerSystem, this.SHIP_COMPONENTS.THRUSTERS);
				laserPower = this.getPowerForComponent(ship.powerSystem, this.SHIP_COMPONENTS.LASERS);
				shieldPower = this.getPowerForComponent(ship.powerSystem, this.SHIP_COMPONENTS.SHIELDS);
				//thrusters
					ship.thrusters.medial.maxStrength*=(1+thrusterPower);
					ship.thrusters.lateral.maxStrength*=(1+thrusterPower);
					ship.thrusters.rotational.maxStrength*=(1+thrusterPower);
					ship.stabilizer.clamps.medial*=(1+thrusterPower);
					ship.stabilizer.clamps.lateral*=(1+thrusterPower);
					ship.stabilizer.clamps.rotational*=(1+thrusterPower);
				//lasers
					ship.laser.maxPower*=(1+laserPower);
				//shields
					ship.destructible.shield.current*=(1+shieldPower);
					ship.destructible.shield.max*=(1+shieldPower);
					ship.destructible.shield.recharge*=(1+shieldPower);

		//thruster percentage for the sound effect
			var thrusterTotal = Math.abs(ship.thrusters.medial.currentStrength)+Math.abs(ship.thrusters.lateral.currentStrength)+Math.abs(ship.thrusters.rotational.currentStrength);
			var thrusterEfficiencyTotal = ship.thrusters.medial.efficiency+ship.thrusters.lateral.efficiency+ship.thrusters.rotational.efficiency;
			ship.thrusters.noiseLevel = (thrusterTotal/thrusterEfficiencyTotal);
	},

	//clears the active thruster values
	shipClearThrusters:function(ship){
		ship.thrusters.medial.targetStrength = 0;
		ship.thrusters.lateral.targetStrength = 0;
		ship.thrusters.rotational.targetStrength = 0;
	},

	shipClearPowerTarget:function(ship){
		ship.powerSystem.target = [0,0,0];
	},

	//add given strength to main thruster
	shipMedialThrusters:function(ship, strength){
		ship.thrusters.medial.targetStrength += strength;
	},

	//add strength to side thruster
	shipRotationalThrusters: function(ship, strength){
		ship.thrusters.rotational.targetStrength += strength;
	},

	//add strength to lateral thruster
	shipLateralThrusters:function(ship, strength){
		ship.thrusters.lateral.targetStrength += strength;
	},

	//rotational stabilizer
	shipRotationalStabilizers:function(ship,dt){
		//if the side thruster isn't active, or is active in the opposite direction of our rotation
		if(ship.thrusters.rotational.targetStrength*ship.rotationalVelocity>=0 && Math.abs(ship.rotationalVelocity) > ship.stabilizer.precision/6)
			//add correctional strength in the opposite direction of our rotation
			this.shipRotationalThrusters(ship,ship.rotationalVelocity*ship.stabilizer.strength*dt); //we check the direction because the stabilizers can apply more thrust than the player
		//or, if we've exceeded our clamp speed and are trying to keep accelerating in that direction
		else if (ship.stabilizer.clamps.enabled && Math.abs(ship.rotationalVelocity)>=ship.stabilizer.clamps.rotational && ship.thrusters.rotational.targetStrength*ship.rotationalVelocity<0)
			//shut off the thruster
			ship.thrusters.rotational.targetStrength = 0;
	},

	//medial stabilizer
	shipMedialStabilizers:function(ship,dt){
		//if the main thruster isn't active, or is working against our velocity
		if(ship.thrusters.medial.targetStrength*ship.medialVelocity>=0 && Math.abs(ship.medialVelocity) > ship.stabilizer.precision)
			//add corrective strength
			this.shipMedialThrusters(ship,ship.medialVelocity*ship.stabilizer.strength*dt);
		//or, if we're past our clamp and trying to keep going
		else if (ship.stabilizer.clamps.enabled && Math.abs(ship.medialVelocity)>=ship.stabilizer.clamps.medial && ship.thrusters.medial.targetStrength*ship.medialVelocity<0)
			//shut off the thruster
			ship.thrusters.medial.targetStrength = 0;
	},

	//lateral stabilizer
	shipLateralStabilizers:function(ship,dt){
		//see above
		if(ship.thrusters.lateral.targetStrength*ship.lateralVelocity>=0 && Math.abs(ship.lateralVelocity) > ship.stabilizer.precision)
			this.shipLateralThrusters(ship,ship.lateralVelocity*ship.stabilizer.strength*dt);
		else if (ship.stabilizer.clamps.enabled && Math.abs(ship.lateralVelocity)>=ship.stabilizer.clamps.lateral && ship.thrusters.lateral.targetStrength*ship.lateralVelocity<0)
			ship.thrusters.lateral.targetStrength = 0;
	},

	shipFireLaser:function(ship){
		var now = Date.now();
		//if the cool down is up
		if(now>ship.laser.lastFireTime+ship.laser.cd*1000){
			ship.laser.lastFireTime = now;
			ship.laser.currentPower = ship.laser.maxPower;	
			if(this.sounds.laser.loaded)
			{
				var laserSound = createjs.Sound.play(this.sounds.laser.id,{interrupt: createjs.Sound.INTERRUPT_ANY});
				laserSound.volume = .5 * (1-(1-this.camera.zoom)/this.soundLevel);	
			}
		}
	},

	shipFireCannon: function(ship){
		var now = Date.now();
		if(now>ship.cannon.lastFireTime+ship.cannon.cd*1000){
			ship.cannon.lastFireTime = now;
			ship.cannon.firing = true;
		}
	},

	shipAI:function(ship, target,dt){
		var vectorToTarget = [target.x-ship.x,target.y-ship.y];
		var relativeAngleToTarget = angleBetweenVectors(ship.forwardVectorX,ship.forwardVectorY,vectorToTarget[0],vectorToTarget[1]);

		if(relativeAngleToTarget>0)
			this.shipRotationalThrusters(ship,-relativeAngleToTarget * dt * ship.ai.accuracy * ship.thrusters.rotational.maxStrength/ship.stabilizer.thrustRatio);
		else if (relativeAngleToTarget<0)
			this.shipRotationalThrusters(ship,-relativeAngleToTarget * dt * ship.ai.accuracy * ship.thrusters.rotational.maxStrength/ship.stabilizer.thrustRatio);

		var distanceSqr = vectorMagnitudeSqr(vectorToTarget[0],vectorToTarget[1]);

		if(relativeAngleToTarget<ship.ai.fireSpread/2 && relativeAngleToTarget>-ship.ai.fireSpread/2)
		{
			if(distanceSqr<(ship.laser.range*ship.laser.range))
				this.shipFireLaser(ship);
			else
				this.shipFireCannon(ship);
		}

		if(distanceSqr > ship.ai.followMax*ship.ai.followMax)
			this.shipMedialThrusters(ship,ship.thrusters.medial.maxStrength/ship.stabilizer.thrustRatio);
		else if(distanceSqr<ship.ai.followMin*ship.ai.followMin)
			this.shipMedialThrusters(ship,-ship.thrusters.medial.maxStrength/ship.stabilizer.thrustRatio);

		var vectorFromTarget = [-vectorToTarget[0],-vectorToTarget[1]];
		var relativeAngleToMe = angleBetweenVectors(target.forwardVectorX,target.forwardVectorY,vectorFromTarget[0],vectorFromTarget[1]);
		//console.log(Math.floor(relativeAngleToMe));

		if(distanceSqr<2*(target.laser.range*target.laser.range) && relativeAngleToMe<90 && relativeAngleToMe>0)
			this.shipLateralThrusters(ship, -ship.thrusters.lateral.maxStrength/ship.stabilizer.thrustRatio);
		else if(distanceSqr<2*(target.laser.range*target.laser.range) && relativeAngleToMe>-90 &&relativeAngleToMe<0)
			this.shipLateralThrusters(ship, ship.thrusters.lateral.maxStrength/ship.stabilizer.thrustRatio);

		this.shipMedialStabilizers(ship,dt);
		this.shipLateralStabilizers(ship,dt);
		this.shipRotationalStabilizers(ship,dt);
	},

	shipKeyboardControl:function(ship, dt){
		//set ship thruster values
			//medial motion
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_W])
					this.shipMedialThrusters(ship,ship.thrusters.medial.maxStrength/ship.stabilizer.thrustRatio);
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_S])
					this.shipMedialThrusters(ship,-ship.thrusters.medial.maxStrength/ship.stabilizer.thrustRatio);
				if(ship.stabilizer.enabled)
					this.shipMedialStabilizers(ship,dt);
			//lateral motion
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_A])
					this.shipLateralThrusters(ship,-ship.thrusters.lateral.maxStrength/ship.stabilizer.thrustRatio);
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_D])
					this.shipLateralThrusters(ship,ship.thrusters.lateral.maxStrength/ship.stabilizer.thrustRatio);
				if(ship.stabilizer.enabled)
					this.shipLateralStabilizers(ship,dt);
			//rotational motion - mouse			
				this.shipRotationalThrusters(ship,-myMouse.direction*myMouse.sensitivity*ship.thrusters.rotational.maxStrength/ship.stabilizer.thrustRatio);
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_LEFT])
					this.shipRotationalThrusters(ship,ship.thrusters.rotational.maxStrength/ship.stabilizer.thrustRatio);
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_RIGHT])
					this.shipRotationalThrusters(ship,-ship.thrusters.rotational.maxStrength/ship.stabilizer.thrustRatio);
				if(ship.stabilizer.enabled)
					this.shipRotationalStabilizers(ship,dt);
			//lasers
				if(myMouse.mousedown[myMouse.BUTTONS.LEFT] || myKeys.keydown[myKeys.KEYBOARD.KEY_SPACE])
				{
					if(this.playerWeaponToggle)
						this.shipFireLaser(ship);
					else
						this.shipFireCannon(ship);
				}
			//power system
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_SHIFT])
					ship.powerSystem.target[this.SHIP_COMPONENTS.THRUSTERS] = 1;
				if(myMouse.mousedown[myMouse.BUTTONS.RIGHT])
					ship.powerSystem.target[this.SHIP_COMPONENTS.LASERS] = 1;
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_ALT])
					ship.powerSystem.target[this.SHIP_COMPONENTS.SHIELDS] = 1;
	},

	clearLasers:function(lasers){
		lasers.length=0;
	},

	clearProjectiles: function(projectiles){
		projectiles.length = 0;
	},

	checkCollisions:function(dt){
		//laser collisions
			this.lasers.forEach(function(laser){
				if(laser.power == 0)
					return;
				var obj; //the chosen object
				var tValOfObj = Number.MAX_VALUE;
				var xInv = laser.endX<laser.startX;
				var yInv = laser.endY<laser.startY;
				var start = [(xInv) ? laser.endX : laser.startX, (yInv) ? laser.endY : laser.startY];
				var end = [(xInv) ? laser.startX : laser.endX, (yInv) ? laser.startY : laser.endY];
				var laserVertices = [
					[laser.startX, laser.startY],
					[laser.endX, laser.endY],
					[laser.previousLaser.endX,laser.previousLaser.endY],
					[laser.previousLaser.startX, laser.previousLaser.startY]
				];
				//laser-asteroid
					for(var c = 0;c<this.asteroids.objs.length;c++){
						var thisObj = this.asteroids.objs[c];
						if(thisObj.x + thisObj.destructible.radius<start[0] || thisObj.x-thisObj.destructible.radius>end[0] || thisObj.y + thisObj.destructible.radius<start[1] || thisObj.y-thisObj.destructible.radius>end[1])
							continue;
						var thisDistance = distanceFromPointToLine(thisObj.x,thisObj.y,laser.startX,laser.startY,laser.endX,laser.endY);
						if(thisDistance[0]<thisObj.destructible.radius && thisDistance[1]<tValOfObj){
							obj = thisObj;
							tValOfObj = thisDistance[1];
						}
					}
				//laser-ship
					for(var c = -1;c<this.otherShips.length;c++){
						var thisObj = ((c==-1) ? this.ship : this.otherShips[c]); //lol
						if(thisObj == laser.owner)
							continue;
						if(thisObj.x + thisObj.destructible.radius<start[0] || thisObj.x-thisObj.destructible.radius>end[0] || thisObj.y + thisObj.destructible.radius<start[1] || thisObj.y-thisObj.destructible.radius>end[1])
							continue;
						var thisDistance = distanceFromPointToLine(thisObj.x,thisObj.y,laser.startX,laser.startY,laser.endX,laser.endY);

						if(thisDistance[1]<tValOfObj && polygonCapsuleSAT(laserVertices, {center1:[thisObj.x, thisObj.y], center2:[thisObj.prevX, thisObj.prevY], radius:thisObj.destructible.radius})){
							obj = thisObj;
							tValOfObj = thisDistance[1];
						}
					}
				//laser-projectile
					for(var c = 0;c<this.projectiles.length;c++){
						var thisObj = this.projectiles[c];
						if(thisObj == laser.owner)
							continue;
						if(thisObj.x + thisObj.destructible.radius<start[0] || thisObj.x-thisObj.destructible.radius>end[0] || thisObj.y + thisObj.destructible.radius<start[1] || thisObj.y-thisObj.destructible.radius>end[1])
							continue;
						var thisDistance = distanceFromPointToLine(thisObj.x,thisObj.y,laser.startX,laser.startY,laser.endX,laser.endY);

						if(thisDistance[1]<tValOfObj && polygonCapsuleSAT(laserVertices, {center1:[thisObj.x, thisObj.y], center2:[thisObj.prevX, thisObj.prevY], radius:thisObj.destructible.radius})){
							obj = thisObj;
							tValOfObj = thisDistance[1];
							console.log('laser-projectile collision');
						}
					}

				//resolve collision
					if(obj)
					{
						obj.destructible.shield.current-=laser.power*dt*(1-tValOfObj);
						if(obj.destructible.shield.current<0)
						{
							obj.destructible.hp+=obj.destructible.shield.current;
							obj.destructible.shield.current = 0;
						}
						//console.log(obj+' hp: '+obj.destructible.hp);
						var laserDir = [laser.endX-laser.startX,laser.endY-laser.startY];
						var newEnd = [laser.startX+tValOfObj*laserDir[0],laser.startY+tValOfObj*laserDir[1]];
						laser.endX = newEnd[0];
						laser.endY = newEnd[1];
					}
			},this);

		//projectile collisions
			for(var n = 0; n<this.projectiles.length; n++){
				var prj = this.projectiles[n];
				var prjCapsule = {center1:[prj.x,prj.y], center2:[prj.prevX, prj.prevY], radius:prj.destructible.radius};
				//projectile-ship
					for(var c = -1;c<this.otherShips.length;c++){
						var thisObj = ((c==-1) ? this.ship : this.otherShips[c]); //lol
						if(thisObj == prj.owner)
							continue;
						var distanceSqr = Math.abs((prj.x - thisObj.x)*(prj.x - thisObj.x) + (prj.y - thisObj.y)*(prj.y - thisObj.y));
						if(distanceSqr>5*(prj.destructible.radius+thisObj.destructible.radius)*(prj.destructible.radius+thisObj.destructible.radius))
							continue;
						if(capsuleCapsuleSAT({center1:[thisObj.x,thisObj.y], center2:[thisObj.prevX, thisObj.prevY], radius:thisObj.destructible.radius}, prjCapsule))
						{
							var velocityDifference = [prj.velocityX - thisObj.velocityX, prj.velocityY - thisObj.velocityY];
							var magnitude = Math.sqrt(velocityDifference[0] * velocityDifference[0] + velocityDifference[1] * velocityDifference[1]);
							var damage = magnitude * prj.destructible.maxHp * prj.destructible.radius/thisObj.destructible.radius;
							prj.destructible.hp-=damage;
							thisObj.destructible.shield.current-=damage;
							if(thisObj.destructible.shield.current<0)
							{
								thisObj.destructible.hp+=thisObj.destructible.shield.current;
								thisObj.destructible.shield.current = 0;
							}
							console.log(damage+' damage, '+magnitude+' magnitude');
						}
					}

				//projectile-asteroid
					for(var c = 0; c<this.asteroids.objs.length; c++){
						var thisObj = this.asteroids.objs[c];
						var distanceSqr = Math.abs((prj.x - thisObj.x)*(prj.x - thisObj.x) + (prj.y - thisObj.y)*(prj.y - thisObj.y));
						if(distanceSqr<=(prj.destructible.radius+thisObj.destructible.radius)*(prj.destructible.radius+thisObj.destructible.radius))
						{
							var magnitude = Math.sqrt(prj.velocityX * prj.velocityX + prj.velocityY * prj.velocityY);
							var damage = magnitude * prj.destructible.maxHp * prj.destructible.radius/thisObj.destructible.radius;
							prj.destructible.hp-=damage;
							thisObj.destructible.hp-=damage;
						}
					}
			}

		//asteroid collisions
			for(var c = -1;c<this.otherShips.length;c++){
				var ship = ((c==-1)? this.ship:this.otherShips[c]);
				for(var n = 0;n<this.asteroids.objs.length;n++){
					var asteroid = this.asteroids.objs[n];
					var distance = (ship.x-asteroid.x)*(ship.x-asteroid.x) + (ship.y-asteroid.y)*(ship.y-asteroid.y);
					var overlap = (ship.destructible.radius+asteroid.radius)*(ship.destructible.radius+asteroid.radius) - distance;
					if(overlap>=0)
					{
						if(this.frameCount==0)
							asteroid.destructible.hp=-1;
						else{
							var objectSpeed = Math.sqrt(ship.velocityX*ship.velocityX+ship.velocityY*ship.velocityY);
							ship.destructible.shield.current-=((c == -1)?.1:.01)*dt*objectSpeed; //player takes 10 times as much damage as the AI
							asteroid.destructible.hp-=.2*dt*objectSpeed;
							if(ship.destructible.shield.current<0)
							{
								ship.destructible.hp+=ship.destructible.shield.current;
								ship.destructible.shield.current = 0;
							}
							ship.velocityX*=(1-2*dt);
							ship.velocityY*=(1-2*dt);
						}
					}
				}
			}
	},	

	//destroys any members of the given destructible array that are outside the given grid by more than the tolerance
	cullDestructibles: function(destructibles, grid, tolerancePercent){
		var gridDimensions = grid.gridLines * grid.gridSpacing;
		var tolerances = [gridDimensions * tolerancePercent, gridDimensions * tolerancePercent];

		for(var c = 0;c<destructibles.length;c++){
			var position = [destructibles[c].x, destructibles[c].y];
			if(!this.isPositionInGrid(position, grid, tolerances))
				destructibles.splice(c--,1);
		}
	},

	//destroys any members of the given destructible array that have zero or less hp
	clearDestructibles:function(destructibles){
		for(var c = 0;c<destructibles.length;c++){
			if(destructibles[c].destructible.hp<=0)
				destructibles.splice(c--,1);
		}
	},

	//destroys all ships
	clearShips:function(ships){
		for(var c = 0;c<ships.length;c++){
			if(ships[c].destructible.hp<=0)
				ships.splice(c--,1);
		}
	},

	//the main game function - called once per frame
	frame:function(){
		this.animationID = requestAnimationFrame(this.frame.bind(this));
		var dt = this.calculateDeltaTime();
		if(dt>this.timeStep*4)
			dt = this.timeStep;
		this.accumulator+=dt;
		while(this.accumulator>=this.timeStep){
			if(!((this.gameState == this.GAME_STATES.PLAYING || this.gameState == this.GAME_STATES.TUTORIAL) && this.paused))
				this.update(this.timeStep);
			this.accumulator-= this.timeStep;
		}
		this.draw();

		//FPS text
		if (this.debug){
			this.fillText(this.camera.ctx,'fps: '+Math.floor(1/dt),15,15,"8pt Orbitron",'white');
			this.fillText(this.camera.ctx,'prjs: '+this.projectiles.length,15,30,"8pt Orbitron",'white');
		}
	},

	//one game tick
	update: function(dt){
	 	//clear values
		this.clearLasers(this.lasers);
		for(var c =-1;c<this.otherShips.length;c++){
			var ship = (c==-1) ? this.ship : this.otherShips[c];
			this.shipClearThrusters(ship);
			this.shipClearPowerTarget(ship);
		}
		this.clearDestructibles(this.asteroids.objs);
		this.clearDestructibles(this.otherShips); 
		this.clearDestructibles(this.projectiles);
		this.cullDestructibles(this.projectiles, this.grid, .3);

	 	if(this.otherShipCount<this.maxOtherShips)
	 	{
			this.otherShipCount+=this.otherShipCount-this.otherShips.length;
			for(;this.otherShips.length<this.otherShipCount;){ //lol
				this.otherShips.push(this.createShip({},this.grid));
				this.otherShips[this.otherShips.length-1].ai = this.createComponentShipAI();
			}
	 	}

		if(this.otherShips.length==0 && this.gameState==this.GAME_STATES.PLAYING)
		{
			this.gameState = this.GAME_STATES.WIN;
			this.maxOtherShips*=2;
			this.thrusterSound.volume = 0;
		}
		else if(this.gameState == this.GAME_STATES.PLAYING && this.ship.destructible.hp<=0)
		{
			this.gameState = this.GAME_STATES.LOSE;
			this.thrusterSound.volume = 0;
		}
		else if(this.gameState == this.GAME_STATES.PLAYING || this.gameState==this.GAME_STATES.TUTORIAL){				

			this.otherShips.forEach(function(ship){
				this.shipAI(ship,this.ship,dt);
			},this);

			this.shipKeyboardControl(this.ship,dt);

		 	//camera zoom controls
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_UP] && this.camera.zoom<=this.camera.maxZoom)
				this.camera.zoom*=1.05;
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_DOWN] && this.camera.zoom>=this.camera.minZoom)
				this.camera.zoom*=.95;
			if(myMouse.wheel)
				this.camera.zoom*=1+(myMouse.wheel/500);
			if(this.camera.zoom>this.camera.maxZoom)
				this.camera.zoom = this.camera.maxZoom;
			else if(this.camera.zoom<this.camera.minZoom)
				this.camera.zoom = this.camera.minZoom;

		 	//update ship, center main camera on ship
			this.updateShip(this.ship,dt);
			this.otherShips.forEach(function(ship){
				this.updateShip(ship,dt);
			},this);

			for(var i = 0; i<this.projectiles.length; i++){
				this.updateProjectile(this.projectiles[i], dt);
			}

			this.checkCollisions(dt);	

			if(this.gameState == this.GAME_STATES.TUTORIAL && myKeys.keydown[myKeys.KEYBOARD.KEY_ENTER]){
				this.resetGame();
				this.gameState = this.GAME_STATES.PLAYING;
			}			
		}
		else if(this.gameState == this.GAME_STATES.TITLE && myKeys.keydown[myKeys.KEYBOARD.KEY_ENTER])
		{
			this.gameState = this.GAME_STATES.TUTORIAL;
			myKeys.keydown[myKeys.KEYBOARD.KEY_ENTER] = false;
			//this.resetGame();
		}
		else if((this.gameState == this.GAME_STATES.WIN || this.gameState == this.GAME_STATES.LOSE) && myKeys.keydown[myKeys.KEYBOARD.KEY_R])
			this.resetGame();

	 	//camera shenanigans
		this.camera.x = lerp(this.camera.x,this.ship.x+this.ship.velocityX/10,12*dt);// this.ship.forwardVectorX*(this.camera.height/6)*(1/this.camera.zoom);
		this.camera.y = lerp(this.camera.y,this.ship.y+this.ship.velocityY/10,12*dt);// this.ship.forwardVectorY*(this.camera.height/6)*(1/this.camera.zoom);
		var rotDiff = this.ship.rotation+this.ship.rotationalVelocity/10 - this.camera.rotation;
		if(rotDiff>180)
			rotDiff-=360;
		else if(rotDiff<-180)
			rotDiff+=360;
		this.camera.rotation += lerp(0,rotDiff,12*dt);
		if(this.camera.rotation>180)
			this.camera.rotation-=360;
		else if(this.camera.rotation<-180)
			this.camera.rotation+=360;
		this.starCamera.x = this.camera.x;
	 	this.starCamera.y = this.camera.y;
	 	this.starCamera.rotation = this.camera.rotation;
	 	this.gridCamera.x = this.camera.x;
	 	this.gridCamera.y = this.camera.y;
	 	this.gridCamera.rotation = this.camera.rotation;
	 	var cameraDistance = 1/this.camera.zoom;
	 	this.starCamera.zoom = 1/(cameraDistance+10000);
	 	this.gridCamera.zoom = 1/(cameraDistance+5);

		//this needs to be done
		resetMouse();

		if(this.thrusterSound && (this.gameState == this.GAME_STATES.PLAYING || this.gameState == this.GAME_STATES.TUTORIAL))
			this.thrusterSound.volume = (this.paused)?0:this.ship.thrusters.noiseLevel*2*(1-(1-this.camera.zoom)/this.soundLevel);

		//because we might use the frame count for something at some point
		this.frameCount++;
	},

	//renders everything
	draw:function(){

		//console.log('drawing');
		//pause screen
	 	if((this.gameState == this.GAME_STATES.PLAYING || this.gameState == this.GAME_STATES.TUTORIAL) && this.paused){
	 		//dt = 0;
	 		this.drawPauseScreen(this.camera);
	 		this.drawLockedGraphic(this.camera);
	 		//this.drawPauseScreen(this.worldCamera);
	 		return;
	 	}
		

		//clear cameras
		this.clearCamera(this.camera);
		this.clearCamera(this.starCamera);
		//this.clearCamera(this.minimapCamera);

		//draw grids then asteroids then ships
		if(this.drawStarField)
			this.drawAsteroids(this.stars,this.starCamera);
		
		
		if(this.gameState == this.GAME_STATES.PLAYING || this.gameState == this.GAME_STATES.TUTORIAL)
		{
			this.drawGrid(this.gridCamera);
			this.drawAsteroidsOverlay(this.asteroids,this.camera,this.gridCamera);
			for(var n = this.otherShips.length-1;n>=-1;n--){
				var ship = (n==-1)?this.ship:this.otherShips[n];
				this.drawShipOverlay(ship,this.camera,this.gridCamera);
			}
			this.drawProjectiles(this.projectiles, this.camera);
			this.drawLasers(this.lasers, this.camera);
			for(var c = this.otherShips.length-1;c>=-1;c--){
				var ship = (c==-1)?this.ship:this.otherShips[c];
				this.drawShip(ship,this.camera);
			}
			
			this.drawAsteroids(this.asteroids,this.camera, this.gridCamera);
			this.drawHUD(this.camera);
			this.drawMinimap(this.minimapCamera);
			if(this.gameState == this.GAME_STATES.TUTORIAL)
				this.drawTutorialGraphics(this.camera);
		}
		else if(this.gameState == this.GAME_STATES.TITLE)
		{
			this.drawAsteroids(this.asteroids,this.camera,this.gridCamera);
			this.drawTitleScreen(this.camera);
		}
		else if(this.gameState == this.GAME_STATES.WIN){
			this.drawGrid(this.gridCamera);
			this.drawAsteroids(this.asteroids,this.camera,this.gridCamera);
			this.drawWinScreen(this.camera);
		}
		else if(this.gameState == this.GAME_STATES.LOSE){
			this.drawGrid(this.gridCamera);
			this.drawAsteroids(this.asteroids,this.camera,this.gridCamera);
			this.drawLoseScreen(this.camera);
		}
		
		

		this.drawLockedGraphic(this.camera);
	},

	//draws the projected overlay (shields, health, laser range) for the given ship using the two given cameras (one for the gameplay plane and one for the projected plane)
	drawShipOverlay:function(ship,camera,gridCamera){
		var ctx = camera.ctx;
		
		var shipPosInCameraSpace = worldPointToCameraSpace(ship.x,ship.y,camera); //get ship's position in camera space
		var shipPosInGridCameraSpace = worldPointToCameraSpace(ship.x,ship.y,gridCamera);
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(shipPosInCameraSpace[0],shipPosInCameraSpace[1]);
		ctx.lineTo(shipPosInGridCameraSpace[0],shipPosInGridCameraSpace[1]);
		ctx.translate(shipPosInGridCameraSpace[0],shipPosInGridCameraSpace[1]);
		ctx.rotate((ship.rotation-gridCamera.rotation) * (Math.PI / 180));
		ctx.arc(0,0,ship.laser.range*gridCamera.zoom,-Math.PI/2,Math.PI*2-Math.PI/2);			
		ctx.rotate(-(ship.rotation-gridCamera.rotation) * (Math.PI / 180));
		ctx.translate(-shipPosInGridCameraSpace[0],-shipPosInGridCameraSpace[1]);
		ctx.lineWidth = .5;
		ctx.strokeStyle = 'grey';
		ctx.globalAlpha = .2;
		ctx.stroke();

		ctx.globalAlpha = .5;
		ctx.translate(shipPosInGridCameraSpace[0],shipPosInGridCameraSpace[1]);
		ctx.scale(gridCamera.zoom,gridCamera.zoom);
		ctx.beginPath();
		ctx.arc(0,0,750,-Math.PI/2,-Math.PI*2*(ship.destructible.shield.current/ship.destructible.shield.max)-Math.PI/2,true);
		ctx.strokeStyle = 'dodgerblue';
		ctx.lineWidth = 100;
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(0,0,600,-Math.PI/2,-Math.PI*2*(ship.destructible.hp/ship.destructible.maxHp)-Math.PI/2,true);
		ctx.strokeStyle = 'green';
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(0,0,300,0,Math.PI*2);
		ctx.fillStyle = ship.color;
		ctx.fill();			
		ctx.beginPath();
		ctx.arc(0,0,ship.destructible.radius,0,Math.PI*2);
		ctx.fillStyle = 'black';
		ctx.globalAlpha = 1;
		ctx.fill();
		ctx.restore();
	},

	//draws the give ship's minimap representation to the given camera
	drawShipMinimap:function(ship,camera){
		var ctx = camera.ctx;
		ctx.save();
		var shipPosInCameraSpace = worldPointToCameraSpace(ship.x,ship.y,camera); //get ship's position in camera space
		ctx.translate(shipPosInCameraSpace[0],shipPosInCameraSpace[1]); //translate to camera space position
		ctx.rotate((ship.rotation-camera.rotation) * (Math.PI / 180)); //rotate by difference in rotations

		ctx.scale(.5,.5); //scale by zoom value

		ctx.translate(0,7);
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

	//draws the given ship in the given camera
	drawShip: function(ship, camera){
		var shipArray = (Array.isArray(ship))?ship:[ship];

		var shipPosInCameraSpace = worldPointToCameraSpace(ship.x,ship.y,camera); //get ship's position in camera space

		if(shipPosInCameraSpace[0] - ship.destructible.radius * camera.zoom > camera.width || shipPosInCameraSpace[0] + ship.destructible.radius * camera.zoom< 0
			|| shipPosInCameraSpace[1] - ship.destructible.radius * camera.zoom> camera.height || shipPosInCameraSpace[1] + ship.destructible.radius * camera.zoom< 0)
			return;

		var ctx = camera.ctx;
		ctx.save();
		ctx.translate(shipPosInCameraSpace[0],shipPosInCameraSpace[1]); //translate to camera space position
		ctx.rotate((ship.rotation-camera.rotation) * (Math.PI / 180)); //rotate by difference in rotations

		ctx.scale(camera.zoom,camera.zoom); //scale by zoom value

		//collider
		/*ctx.save();
		ctx.fillStyle = 'red';
		ctx.beginPath();
		ctx.arc(0,0,ship.destructible.radius,0,Math.PI*2);
		ctx.fill();
		ctx.restore();*/

		ctx.translate(0,7);

		//Thrusters
			//forward thrust
			for(var c = 0;c<=this.thrusterDetail;c++){
				ctx.fillStyle = shadeRGBColor(ship.thrusters.color,.5*c);
				ctx.save();
				ctx.beginPath();

				//Medial Thrusters
					//forward
						if(ship.thrusters.medial.currentStrength>0){
							//ctx.save();				
							//ctx.fillStyle = ship.thrusterColor;
							
							ctx.moveTo(-15,5);
							ctx.lineTo(-10,5);
							ctx.lineTo(-12.5,5+40*(ship.thrusters.medial.currentStrength/ship.thrusters.medial.efficiency)*(1-(c/(this.thrusterDetail+1)))); //furthest point goes outward with thruster strength and scales inward with efficiency
							ctx.lineTo(-15,5);
							ctx.moveTo(15,5);
							ctx.lineTo(10,5);
							ctx.lineTo(12.5,5+40*(ship.thrusters.medial.currentStrength/ship.thrusters.medial.efficiency)*(1-(c/(this.thrusterDetail+1))));
							ctx.lineTo(15,5);
							//ctx.globalAlpha = ((c+1)/(this.thrusterDetail+1));
							//ctx.fill();
							//ctx.restore();
						}
					//backward
						else if(ship.thrusters.medial.currentStrength<0){
							//ctx.save();				
							//ctx.beginPath();
							ctx.moveTo(-15,0);
							ctx.lineTo(-10,0);
							ctx.lineTo(-12.5,40*(ship.thrusters.medial.currentStrength/ship.thrusters.medial.efficiency)*(1-(c/(this.thrusterDetail+1))));
							ctx.lineTo(-15,0);
							ctx.moveTo(15,0);
							ctx.lineTo(10,0);
							ctx.lineTo(12.5,40*(ship.thrusters.medial.currentStrength/ship.thrusters.medial.efficiency)*(1-(c/(this.thrusterDetail+1))));
							ctx.lineTo(15,0);
							//ctx.globalAlpha = ((c+1)/(this.thrusterDetail+1));
							//ctx.fill();
							//ctx.restore();
						}	

				//rotational thrusters	
					//ccw
						if(ship.thrusters.rotational.currentStrength>0){
							//ctx.save();				
							//ctx.beginPath();
							ctx.moveTo(5,-10);
							ctx.lineTo(5,-15);
							ctx.lineTo(5+40*(ship.thrusters.rotational.currentStrength/ship.thrusters.rotational.efficiency)*(1-(c/(this.thrusterDetail+1))),-12.5);
							ctx.lineTo(5,-10);
							//ctx.globalAlpha = ((c+1)/(this.thrusterDetail+1));
							//ctx.fill();
							//ctx.restore();
						}
					//cw
						else if(ship.thrusters.rotational.currentStrength<0){
							//ctx.save();				
							//ctx.beginPath();
							ctx.moveTo(-5,-10);
							ctx.lineTo(-5,-15);
							ctx.lineTo(-5+40*(ship.thrusters.rotational.currentStrength/ship.thrusters.rotational.efficiency)*(1-(c/(this.thrusterDetail+1))),-12.5);
							ctx.lineTo(-5,-10);
							//ctx.globalAlpha = ((c+1)/(this.thrusterDetail+1));
							//ctx.fill();
							//ctx.restore();
						}

				//lateral thrusters
					//rightward
						if(ship.thrusters.lateral.currentStrength>0){
							//ctx.save();				
							//ctx.beginPath();
							ctx.moveTo(-10,0);
							ctx.lineTo(-10,-5);
							ctx.lineTo(-10-40*(ship.thrusters.lateral.currentStrength/ship.thrusters.lateral.efficiency)*(1-(c/(this.thrusterDetail+1))),-2.5);
							ctx.lineTo(-10,0);
							//ctx.globalAlpha = ((c+1)/(this.thrusterDetail+1));
							//ctx.fill();
							//ctx.restore();
						}
					//leftward
						else if(ship.thrusters.lateral.currentStrength<-0.01){
							//ctx.save();				
							//ctx.beginPath();
							ctx.moveTo(10,0);
							ctx.lineTo(10,-5);
							ctx.lineTo(10-40*(ship.thrusters.lateral.currentStrength/ship.thrusters.lateral.efficiency)*(1-(c/(this.thrusterDetail+1))),-2.5);
							ctx.lineTo(10,0);
							//ctx.globalAlpha = ((c+1)/(this.thrusterDetail+1));
							//ctx.fill();
							//ctx.restore();
						}

				ctx.globalAlpha = ((c+1)/(this.thrusterDetail+1));
				ctx.fill();
				ctx.restore();
			}

		//shields
			var shieldCoeff = (ship.destructible.shield.max/ship.destructible.shield.efficiency);
			ctx.save();
			ctx.fillStyle = 'dodgerblue';
			ctx.beginPath();
			//ctx.arc(0,-5,30,0,Math.PI*2);
			ctx.moveTo(-20-1*shieldCoeff,10+1*shieldCoeff);
			ctx.lineTo(0,0+.5*shieldCoeff);
			ctx.lineTo(20+1*shieldCoeff,10+1*shieldCoeff);
			ctx.lineTo(0,-30-1.2*shieldCoeff);
			ctx.globalAlpha = ship.destructible.shield.current/ship.destructible.shield.max;
			ctx.fill();
			ctx.restore();

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

	//draws all laser objects in the given array to the given camera
	drawLasers:function(lasers,camera){
		var ctx = camera.ctx;
		lasers.forEach(function(laser){
			if(laser.power == 0)
				return;
			var start = worldPointToCameraSpace(laser.startX,laser.startY,camera);
			var end = worldPointToCameraSpace(laser.endX,laser.endY,camera);
			//var startPrev = worldPointToCameraSpace(laser.previousLaser.startX,laser.previousLaser.startY,camera);
			//var endPrev = worldPointToCameraSpace(laser.previousLaser.endX,laser.previousLaser.endY,camera);
			var angle = angleBetweenVectors(end[0]-start[0],end[1]-start[1],1,0);
			var rightVector = rotate(0,0,1,0,angle+90	);
			var width = (laser.power/laser.efficiency)*camera.zoom;
			if(width<.8)
				width = .8;
			for(var c = 0;c<=this.laserDetail;c++)
			{
				var coeff = 1-(c/(this.laserDetail+1));
				ctx.save();
				ctx.beginPath();
				ctx.moveTo(start[0],start[1]);
				ctx.lineTo(start[0]+coeff*width*rightVector[0]/2,start[1]+width*rightVector[1]/2);
				ctx.lineTo(end[0],end[1]);
				ctx.lineTo(start[0]-coeff*width*rightVector[0]/2,start[1]-width*rightVector[1]/2);
				ctx.arc(start[0],start[1],coeff*width/2,-(angle-90)*(Math.PI/180),(angle-90)*(Math.PI/180)-90,false);
				//ctx.closePath();
				//ctx.globalAlpha = 
				ctx.fillStyle = shadeRGBColor(laser.color,0+c/(this.laserDetail+1));
				//ctx.lineCap = 'round';
				
				//ctx.lineWidth = width;
				ctx.fill();
				ctx.restore();
			}
		},this);
	},

	//draws all projectile objects in the given array to the given camera
	drawProjectiles: function(projectiles, camera){
		var ctx = camera.ctx;
		projectiles.forEach(function(prj){
			var start = worldPointToCameraSpace(prj.prevX, prj.prevY, camera);
			var end = worldPointToCameraSpace(prj.x, prj.y, camera);

			if(start[0] > camera.width+prj.destructible.radius || start[0] < 0 - prj.destructible.radius || start[1] > camera.height + prj.destructible.radius || start[1] < 0 - prj.destructible.radius)
				return;

			ctx.save();
			ctx.beginPath();
			ctx.moveTo(start[0], start[1]);
			ctx.lineTo(end[0], end[1]);
			ctx.strokeStyle = prj.color;
			ctx.strokeWidth = ((prj.destructible.radius>5)? prj.destructible.radius : 5) * camera.zoom;
			ctx.stroke();
			ctx.restore();
		});
	},

	//draws the projected overlay for all asteroids in the given array to the given main and projected cameras
	drawAsteroidsOverlay:function(asteroids, camera, gridCamera){
		var start = [0,0];
		var end = [camera.width,camera.height];
		var ctx = camera.ctx;
		var cameraPositions = [];
		if(gridCamera)
		{
			ctx.save();
			ctx.beginPath();
			for(var c = 0; c<asteroids.objs.length;c++)
			{
				var asteroid = asteroids.objs[c];
				var gridPosition = worldPointToCameraSpace(asteroid.x,asteroid.y,gridCamera);
				if(gridPosition[0] + asteroid.destructible.radius*gridCamera.zoom<start[0] || gridPosition[0] - asteroid.destructible.radius*gridCamera.zoom>end[0] || gridPosition[1] + asteroid.destructible.radius*gridCamera.zoom<start[1] || gridPosition[1] - asteroid.destructible.radius*gridCamera.zoom>end[1])
					continue;			
				cameraPositions[c] =(worldPointToCameraSpace(asteroid.x,asteroid.y,camera));
				ctx.moveTo(cameraPositions[c][0],cameraPositions[c][1]);
				ctx.lineTo(gridPosition[0],gridPosition[1]);
				ctx.moveTo(gridPosition[0],gridPosition[1]);
				//ctx.beginPath();
				ctx.arc(gridPosition[0],gridPosition[1], asteroid.destructible.radius*gridCamera.zoom,0,Math.PI*2);
			}	
			ctx.strokeStyle = 'grey';
			ctx.lineWidth = .5;
			ctx.globalAlpha = .5;
			ctx.stroke();
			ctx.restore();		
		}
	},

	//draws asteroids from the given asteroids array to the given camera
	drawAsteroids: function(asteroids,camera){
		var start = [0,0];
		var end = [camera.width,camera.height];
		var ctx = camera.ctx;
		for(var group = 0;group<asteroids.colors.length;group++){
			ctx.save()
			ctx.fillStyle = asteroids.colors[group];
			ctx.beginPath();
			for(var c = 0;c<asteroids.objs.length;c++){
				var asteroid = asteroids.objs[c];
				if(asteroid.colorIndex!=group)
					continue;

				var finalPosition = worldPointToCameraSpace(asteroid.x,asteroid.y,camera); //get asteroid's position in camera space
				
				if(finalPosition[0] + asteroid.radius*camera.zoom<start[0] || finalPosition[0]-asteroid.radius*camera.zoom>end[0] || finalPosition[1] + asteroid.radius*camera.zoom<start[1] || finalPosition[1]-asteroid.radius*camera.zoom>end[1])
						continue;
				ctx.moveTo(finalPosition[0],finalPosition[1]);
				ctx.arc(finalPosition[0],finalPosition[1],asteroid.radius*camera.zoom,0,Math.PI*2);
			};
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		};
	},

	//draws the heads-up display to the given camera
	drawHUD: function(camera){
		var ctx = camera.ctx;
		ctx.save(); // NEW
		ctx.textAlign = 'center';
		ctx.textBaseline = 'center';
		//this.fillText(ctx, "Shields: "+Math.round(this.ship.destructible.shield.current),camera.width/15,7.5*camera.height/10,"12pt Prime",'white')
		//this.fillText(ctx, "HP: "+Math.round(this.ship.destructible.hp),camera.width/15,8*camera.height/10,"12pt Prime",'white')
		ctx.fillRect(0,camera.height,camera.width,-30);
		this.fillText(ctx, ((this.ship.stabilizer.enabled)?'assisted':'manual'),camera.width/2,camera.height-10,"bold 12pt Orbitron",(this.ship.stabilizer.enabled)?'green':'red');
		ctx.textAlign = 'left';
		this.fillText(ctx,'limiter',10,camera.height-10,"8pt Orbitron",'white');
		if(this.ship.stabilizer.clamps.enabled)
		{
			ctx.textAlign = 'right';
			this.fillText(ctx,Math.round(this.ship.stabilizer.clamps.medial),110,camera.height-10,"10pt Orbitron",'green');
			this.fillText(ctx,Math.round(this.ship.stabilizer.clamps.lateral),160,camera.height-10,"10pt Orbitron",'cyan');
			this.fillText(ctx,Math.round(this.ship.stabilizer.clamps.rotational),195,camera.height-10,"10pt Orbitron",'yellow');
		}
		else
		{
			ctx.textAlign = 'left';
			this.fillText(ctx,'disabled',110,camera.height-10,"10pt Orbitron",'red');
		}
		//this.fillText(ctx, "Thruster clamps: "+((this.ship.stabilizer.clamps.enabled)?'Medial '+Math.round(this.ship.stabilizer.clamps.medial)+' Lateral '+Math.round(this.ship.stabilizer.clamps.lateral)+' Rotational '+Math.round(this.ship.stabilizer.clamps.rotational):'disabled'),0,camera.height-10,"12pt Prime",'white')
		ctx.textAlign = 'right';
		this.fillText(ctx,'T '+Math.round(this.getPowerForComponent(this.ship.powerSystem,this.SHIP_COMPONENTS.THRUSTERS)*100)+'%',camera.width-220,camera.height-10,"10pt Orbitron",'green');
		this.fillText(ctx,' L '+Math.round(this.getPowerForComponent(this.ship.powerSystem,this.SHIP_COMPONENTS.LASERS)*100)+'%',camera.width-120,camera.height-10,"10pt Orbitron",'red');
		this.fillText(ctx,' S '+Math.round(this.getPowerForComponent(this.ship.powerSystem,this.SHIP_COMPONENTS.SHIELDS)*100)+'%',camera.width-20,camera.height-10,"10pt Orbitron",'dodgerblue');
		//this.fillText(ctx, "Overcharge: Thrusters "+Math.round(this.getPowerForComponent(this.ship.powerSystem,this.SHIP_COMPONENTS.THRUSTERS)*100)+'% Laser '+Math.round(this.getPowerForComponent(this.ship.powerSystem,this.SHIP_COMPONENTS.LASERS)*100)+'% Shields '+Math.round(this.getPowerForComponent(this.ship.powerSystem,this.SHIP_COMPONENTS.SHIELDS)*100)+'%',camera.width,camera.height-10,"10pt Orbitron",'white')
		ctx.restore(); // NEW
	},

	//draws the minimap to the given camera
	//note that the minimap camera has a viewport
	drawMinimap:function(camera){
		var ctx = camera.ctx;
		var viewportStart = [camera.width*camera.viewport.startX,camera.height*camera.viewport.startY];
		var viewportEnd = [camera.width*camera.viewport.endX,camera.height*camera.viewport.endY];
		var viewportDimensions = [viewportEnd[0]-viewportStart[0],viewportEnd[1]-viewportStart[1]];
		ctx.save();
		ctx.translate(0,-30);
		//ctx.rect(viewportStart[0],viewportStart[1]-30,viewportDimensions[0],viewportDimensions[1]);
		//ctx.clip();
		ctx.beginPath();
		ctx.rect(viewportStart[0],viewportStart[1],viewportDimensions[0],viewportDimensions[1]);
		ctx.fillStyle = 'black';
		ctx.fill();
		ctx.clip();
		ctx.translate((viewportStart[0]+viewportDimensions[0]/2-camera.width/2),(viewportStart[1]+viewportDimensions[1]/2-camera.height/2));
		//ctx.translate(600,300);
		this.drawGrid(this.minimapCamera, true);
		this.drawAsteroids(this.asteroids,this.minimapCamera);
		for(var n = this.otherShips.length-1;n>=-1;n--){
			var ship = (n==-1)?this.ship:this.otherShips[n];
			this.drawShipMinimap(ship,this.minimapCamera);
		}
		ctx.restore();
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
		this.fillText(ctx,"Space Battle With Lasers",camera.width/2,camera.height/5,"bold 64pt Aroma",'blue',.5);
		this.fillText(ctx,"SPACE BATTLE WITH LASERS",camera.width/2,camera.height/5,"bold 24pt Aroma",'white');
		this.fillText(ctx,"Press ENTER to start",camera.width/2,4*camera.height/5,"12pt Orbitron",'white');
		ctx.restore();
	},

	drawWinScreen:function(camera){
		var ctx = camera.ctx;
		ctx.save();
		ctx.fillStyle = 'black';
		ctx.globalAlpha = .5;
		ctx.fillRect(0,0,camera.width,camera.height);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.globalAlpha = 1;
		this.fillText(ctx,"You win!",camera.width/2,camera.height/5,"24pt Aroma",'white');
		this.fillText(ctx,"Good for you. Press R to continue.",camera.width/2,4*camera.height/5,"12pt Orbitron",'white');
		ctx.restore();		
	},

	drawLoseScreen:function(camera){
		var ctx = camera.ctx;
		ctx.save();
		ctx.fillStyle = 'black';
		ctx.globalAlpha = .5;
		ctx.fillRect(0,0,camera.width,camera.height);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.globalAlpha = 1;
		this.fillText(ctx,"You lose!",camera.width/2,camera.height/5,"24pt Aroma",'white');
		this.fillText(ctx,"Sucks to be you. Press R to try again.",camera.width/2,4*camera.height/5,"12pt Orbitron",'white');
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
		this.fillText(ctx,"Paused",camera.width/2,camera.height/5,"24pt Aroma",'white');
		ctx.restore();
	},

	//draws the "click me" graphic
	drawLockedGraphic:function(camera){
		if(locked)
			return;
		var ctx = camera.ctx;
		ctx.save();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		this.fillText(ctx,"Click me",camera.width/2,camera.height/2,"10pt Orbitron",'white');
		ctx.restore();
	},

	drawTutorialGraphics:function(camera){
		var ctx = camera.ctx;
		ctx.save();
		ctx.textAlign = 'left';
		this.fillText(ctx,"WASD moves your ship",camera.width/10,camera.height/12,"10pt Orbitron",'white');
		this.fillText(ctx,"LEFT and RIGHT arrow or mouse turns your ship",camera.width/10,2*camera.height/12,"10pt Orbitron",'white');		
		this.fillText(ctx,"UP and DOWN arrow or mouse-wheel zooms the camera",camera.width/10,3*camera.height/12,"10pt Orbitron",'white');
		this.fillText(ctx,"SPACE or LEFT-CLICK fires your laser",camera.width/10,4*camera.height/12,"10pt Orbitron",'white');
		this.fillText(ctx,"SHIFT over-charges your thrusters",camera.width/10,5*camera.height/12,"10pt Orbitron",'white');
		this.fillText(ctx,"ALT over-charges your shield",camera.width/10,6*camera.height/12,"10pt Orbitron",'white');
		this.fillText(ctx,"RIGHT-CLICK over-charges your laser",camera.width/10,7*camera.height/12,"10pt Orbitron",'white');
		this.fillText(ctx,"C toggles the velocity limiter",camera.width/10,8*camera.height/12,"10pt Orbitron",'white');
		this.fillText(ctx,"TAB switches between assisted and manual controls",camera.width/10,9*camera.height/12,"10pt Orbitron",'white');
		this.fillText(ctx,"P pauses, F turns off the star-field graphics (they can be a resource hog)",camera.width/10,10*camera.height/12,"10pt Orbitron",'white');
		this.fillText(ctx,"Play around for a bit, then press ENTER to start the game. Your goal is to destroy all enemy ships",camera.width/10,11*camera.height/12,"10pt Orbitron",'white');
		//this.fill
	},

	pauseGame:function(){
		this.paused = true;
		cancelAnimationFrame(this.animationID);
		this.frame.bind(this)();
	},

	resumeGame:function(){
		cancelAnimationFrame(this.animationID);
		this.paused = false;
		this.frame.bind(this)();
	},

	fillText: function(ctx,string, x, y, css, color, alpha) {
		ctx.save();
		// https://developer.mozilla.org/en-US/docs/Web/CSS/font
		ctx.font = css;
		ctx.fillStyle = color;
		if(alpha)
			ctx.globalAlpha = alpha;
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