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
	drawStarField:true,
	isoAngle:0,
	thrusterDetail:5,
	laserDetail:5,
	gameState:0,
	GAME_STATES:{
		TITLE:0,
		PLAYING:1,
		WIN:2,
		LOSE:3,
		MENU:4,
		SHIPCONFIG:5
	},
	SHIP_COMPONENTS:{
		THRUSTERS:0,
		LASERS:1,
		SHIELDS:2
	},
   	lastTime: 0, // used by calculateDeltaTime() 
    debug: true,
	paused:false,
	animationID:0,
	frameCount:0,
	runningTime:0,
	ship:{},
	otherShips:[],
	otherShipCount:5,
	lasers:[],
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
				interval:50
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
			'#654321',
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
    // methods
	init : function() {
		// initialize properties
		var canvas = document.querySelector('#canvas1');
		//canvas.onmousedown = this.doMousedown.bind(this);
		//var canvas2 = document.querySelector('#canvas2');
		//canvas2.onmousedown = this.doMousedown.bind(this);
		
		this.makeAsteroids.bind(this, this.asteroids, this.grid)();
		this.generateStarField.bind(this, this.stars)();
		this.ship = this.createShip(this.grid);
		this.camera = this.createCamera(canvas,{x:this.ship.x,y:this.ship.y,rotation:this.ship.rotation,zoom:.5,minZoom:.025,maxZoom:5});
		this.camera.globalCompositeOperation = 'hard-light';
		this.starCamera = this.createCamera(canvas);
		this.gridCamera = this.createCamera(canvas);
		for(var c = 0;c<this.otherShipCount;c++)
		{
			this.otherShips.push(this.createShip(this.grid));
			this.otherShips[c].ai = this.createComponentShipAI();
		}

		// start the game loop
		this.update();
	},
	resetGame:function(){
		this.ship.destructible.hp = this.ship.destructible.maxHp;
		this.ship.destructible.shield.current = this.ship.destructible.shield.max;
		this.makeAsteroids.bind(this,this.asteroids,this.grid)();
		this.otherShips = [];
		for(var c = 0;c<this.otherShipCount;c++)
		{
			this.otherShips.push(this.createShip(this.grid));
			this.otherShips[c].ai = this.createComponentShipAI();
		}
		this.gameState = this.GAME_STATES.PLAYING;
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
	createShip:function(grid){
		var lower = [grid.gridStart[0],grid.gridStart[1]];
		var upper = [lower[0]+grid.gridLines*grid.gridSpacing,lower[1]+grid.gridLines*grid.gridSpacing];
		return {
			//position/rotation
			x:Math.random()*(upper[0]-lower[0])+lower[0],
			y:Math.random()*(upper[1]-lower[1])+lower[1],
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
			destructible:this.createComponentDestructible({
				hp:100,
				radius:25,
				shield:{
					max:100,
					recharge:3,
					efficiency:8
				}
			}),
			thrusters:{
				color:getRandomBrightColor(),
				medial:this.createComponentThruster({
					maxStrength:3000,
					efficiency:1000
				}),
				lateral:this.createComponentThruster({
					maxStrength:2000,
					efficiency:1000
				}),
				rotational:this.createComponentThruster({
					maxStrength:750,
					efficiency:1000
				})
			},
			stabilizer:this.createComponentStabilizer(),
			powerSystem:this.createComponentPowerSystem(),
			//colors
			color:getRandomBrightColor(),
			//used for controlling laser fire rate
			//lastLaserTime:0,
			laser:this.createComponentLaser()
		};
	},
	createComponentThruster:function(objectParams){
		if(!objectParams)
			objectParams = {};
		return {
			currentStrength:0,
			targetStrength:0,
			maxStrength: (objectParams.maxStrength)?objectParams.maxStrength:1000,
			efficiency: (objectParams.efficiency) ? objectParams.efficiency:1000,
			powerRampPercentage: (objectParams.powerRampPercentage)? objectParams.powerRampPercentage: 20
		};
	},
	createComponentPowerSystem:function(objectParams){
		if(!objectParams)
			objectParams = {};
		return{
			current:[0,0,0],
			target:[0,0,0],
			transferRate:6
		};
	},
	createComponentStabilizer:function(objectParams){
		if(!objectParams)
			objectParams = {};
		return{
			enabled: (objectParams.enabled)? objectParams.enabled:true,
			strength: (objectParams.strength)? objectParams.strength:800,
			thrustRatio: (objectParams.thrustRatio)?objectParams.thrustRatio:1.5,
			clamps: this.createComponentStabilizerClamps(objectParams.clamps)
		};
	},
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
			maxPower:(objectParams.maxPower)?objectParams.maxPower:3000,
			efficiency:(objectParams.efficiency)?objectParams.efficiency:100,
			spread:(objectParams.spread)?objectParams.spread:.8
		};
	},
	createComponentDestructible:function(objectParams){
		if(!objectParams)
			objectParams = {};
		return{
			hp:(objectParams.hp)?objectParams.hp:500,
			maxHp: (objectParams.hp)?objectParams.hp:500,
			radius:(objectParams.radius)?objectParams.radius:500,
			shield:this.createComponentDestructibleShield(objectParams.shield)
		};
	},
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
	getPowerForComponent:function(ps,component){
		if(component>=ps.current.length || component<0)
			return 0;
		var components = ps.current.length;
		return clamp(0,(ps.current[component]-(1/components))/(2*(1/components)),1);
	},
	//draws the grid in the given camera
	drawGrid:function(camera){
		var ctx = camera.ctx;
		var gridLines = this.grid.gridLines;
		var gridSpacing = this.grid.gridSpacing;
		var gridStart = this.grid.gridStart;

		for(var c = 0;c<this.grid.colors.length;c++){			
			ctx.save();
			ctx.beginPath();
			for(var x = 0;x<=gridLines;x++){
				if(x%this.grid.colors[c].interval != 0)
						continue;
				var correctInterval = true;
				for(var n = 0;n<c;n++)
				{
					if(x%this.grid.colors[n].interval == 0)
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
					if(y%this.grid.colors[n].interval == 0)
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
	generateStarField:function(stars){
		var lower = -10000000;
		var upper = 10000000;
		var maxRadius = 8000;
		var minRadius = 2000;
		for(var c=0;c<500;c++){
			var group = Math.floor(Math.random()*this.asteroids.colors.length);
			stars.objs.push({
				x: Math.random()*(upper-lower)+lower,
				y: Math.random()*(upper-lower)+lower,
				radius: Math.random()*(maxRadius-minRadius)+minRadius,
				colorIndex:group
			});
		}
	},
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
	//draws the given ship in the given camera
	drawShip: function(ship, camera){
		var ctx = camera.ctx;
		ctx.save();
		var shipPosInCameraSpace = worldPointToCameraSpace(ship.x,ship.y,camera); //get ship's position in camera space

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

		//main thrusters
		//forward thrust
		for(var c = 0;c<=this.thrusterDetail;c++){
			ctx.fillStyle = shadeRGBColor(ship.thrusters.color,.5*c);
			if(ship.thrusters.medial.currentStrength>0){
				ctx.save();				
				//ctx.fillStyle = ship.thrusterColor;
				ctx.beginPath();
				ctx.moveTo(-15,5);
				ctx.lineTo(-10,5);
				ctx.lineTo(-12.5,5+40*(ship.thrusters.medial.currentStrength/ship.thrusters.medial.efficiency)*(1-(c/(this.thrusterDetail+1)))); //furthest point goes outward with thruster strength and scales inward with efficiency
				ctx.lineTo(-15,5);
				ctx.moveTo(15,5);
				ctx.lineTo(10,5);
				ctx.lineTo(12.5,5+40*(ship.thrusters.medial.currentStrength/ship.thrusters.medial.efficiency)*(1-(c/(this.thrusterDetail+1))));
				ctx.lineTo(15,5);
				ctx.globalAlpha = ((c+1)/(this.thrusterDetail+1));
				ctx.fill();
				ctx.restore();
			}
			//backward thrust
			else if(ship.thrusters.medial.currentStrength<0){
				ctx.save();				
				ctx.beginPath();
				ctx.moveTo(-15,0);
				ctx.lineTo(-10,0);
				ctx.lineTo(-12.5,40*(ship.thrusters.medial.currentStrength/ship.thrusters.medial.efficiency)*(1-(c/(this.thrusterDetail+1))));
				ctx.lineTo(-15,0);
				ctx.moveTo(15,0);
				ctx.lineTo(10,0);
				ctx.lineTo(12.5,40*(ship.thrusters.medial.currentStrength/ship.thrusters.medial.efficiency)*(1-(c/(this.thrusterDetail+1))));
				ctx.lineTo(15,0);
				ctx.globalAlpha = ((c+1)/(this.thrusterDetail+1));
				ctx.fill();
				ctx.restore();
			}	

			//rotational thrusters	
			//ccw
			if(ship.thrusters.rotational.currentStrength>0){
				ctx.save();				
				ctx.beginPath();
				ctx.moveTo(5,-10);
				ctx.lineTo(5,-15);
				ctx.lineTo(5+40*(ship.thrusters.rotational.currentStrength/ship.thrusters.rotational.efficiency)*(1-(c/(this.thrusterDetail+1))),-12.5);
				ctx.lineTo(5,-10);
				ctx.globalAlpha = ((c+1)/(this.thrusterDetail+1));
				ctx.fill();
				ctx.restore();
			}
			//cw
			else if(ship.thrusters.rotational.currentStrength<0){
				ctx.save();				
				ctx.beginPath();
				ctx.moveTo(-5,-10);
				ctx.lineTo(-5,-15);
				ctx.lineTo(-5+40*(ship.thrusters.rotational.currentStrength/ship.thrusters.rotational.efficiency)*(1-(c/(this.thrusterDetail+1))),-12.5);
				ctx.lineTo(-5,-10);
				ctx.globalAlpha = ((c+1)/(this.thrusterDetail+1));
				ctx.fill();
				ctx.restore();
			}

			//lateral thrusters
			//rightward
			if(ship.thrusters.lateral.currentStrength>0){
				ctx.save();				
				ctx.beginPath();
				ctx.moveTo(-10,0);
				ctx.lineTo(-10,-5);
				ctx.lineTo(-10-40*(ship.thrusters.lateral.currentStrength/ship.thrusters.lateral.efficiency)*(1-(c/(this.thrusterDetail+1))),-2.5);
				ctx.lineTo(-10,0);
				ctx.globalAlpha = ((c+1)/(this.thrusterDetail+1));
				ctx.fill();
				ctx.restore();
			}
			//leftward
			else if(ship.thrusters.lateral.currentStrength<-0.01){
				ctx.save();				
				ctx.beginPath();
				ctx.moveTo(10,0);
				ctx.lineTo(10,-5);
				ctx.lineTo(10-40*(ship.thrusters.lateral.currentStrength/ship.thrusters.lateral.efficiency)*(1-(c/(this.thrusterDetail+1))),-2.5);
				ctx.lineTo(10,0);
				ctx.globalAlpha = ((c+1)/(this.thrusterDetail+1));
				ctx.fill();
				ctx.restore();
			}
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
		var mainThrust = ship.thrusters.medial.targetStrength;
		var strength = mainThrust;

		//clamp target strength to the thruster's max
		var maxStrength = ship.thrusters.medial.maxStrength;
		strength = clamp(-maxStrength,strength,maxStrength);
		//lerp current thruster strength to target strength at the power ramp rate, then set current strength and the target strength to the lerped value
		strength = ship.thrusters.medial.currentStrength = lerp(ship.thrusters.medial.currentStrength,strength,ship.thrusters.medial.powerRampPercentage*dt); //for the lolz
		strength = clamp(-maxStrength,strength,maxStrength);

		//add forward vector times strength to acceleration
		accelerationX += normalizedForwardVector[0]*strength;
		accelerationY += normalizedForwardVector[1]*strength;

		//lateral
		var latThrust = ship.thrusters.lateral.targetStrength;
		var strength = latThrust;

		//clamp strength
		var maxStrength = ship.thrusters.lateral.maxStrength;
		strength = clamp(-maxStrength,strength,maxStrength);
		//lerp current thruster strength to target strength at the power ramp rate, then set current strength and the target strength to the lerped value
		strength = ship.thrusters.lateral.currentStrength = lerp(ship.thrusters.lateral.currentStrength,strength,ship.thrusters.lateral.powerRampPercentage*dt); //for the lolz
		strength = clamp(-maxStrength,strength,maxStrength);

		//add right vector times strength to acceleration
		accelerationX += normalizedRightVector[0]*strength;
		accelerationY += normalizedRightVector[1]*strength;

		//rotational
		var rotThrust = ship.thrusters.rotational.targetStrength;
		var strength = rotThrust;

		//clamp strength
		var maxStrength = ship.thrusters.rotational.maxStrength;
		strength = clamp(-maxStrength,strength,maxStrength);
		//lerp current thruster strength to target strength at the power ramp rate, then set current strength and the target strength to the lerped value
		strength = ship.thrusters.rotational.currentStrength = lerp(ship.thrusters.rotational.currentStrength,strength,ship.thrusters.rotational.powerRampPercentage*dt); //for the lolz
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
		if(ship.laser.currentPower>0){
			var laserVector = [0,-ship.laser.range];
			laserVector = rotate(0,0,laserVector[0],laserVector[1],-ship.rotation+Math.random()*ship.laser.spread-ship.laser.spread/2);
			this.createLaser(this.lasers,ship.x+normalizedForwardVector[0]*30,ship.y+normalizedForwardVector[1]*30,ship.x+laserVector[0],ship.y+laserVector[1],ship.laser.color,ship.laser.currentPower, ship.laser.efficiency);
			ship.laser.currentPower-=ship.laser.maxPower*(1-ship.laser.coherence)*dt*1000;
		}
		else if(ship.laser.currentPower<0)
			ship.laser.currentPower=0;

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
		ship.powerSystem.current = lerp3d(ship.powerSystem.current,ship.powerSystem.target,ship.powerSystem.transferRate*dt);

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
		if(ship.thrusters.rotational.targetStrength*ship.rotationalVelocity>=0)
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
		if(ship.thrusters.medial.targetStrength*ship.medialVelocity>=0)
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
		if(ship.thrusters.lateral.targetStrength*ship.lateralVelocity>=0)
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

		if(relativeAngleToTarget<ship.ai.fireSpread/2 && relativeAngleToTarget>-ship.ai.fireSpread/2  && distanceSqr<(ship.laser.range*ship.laser.range))
			this.shipFireLaser(ship);

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
	createLaser:function(lasers, startX,startY,endX,endY,color, power,efficiency){
		lasers.push({
			startX:startX,
			startY:startY,
			endX:endX,
			endY:endY,
			color:color,
			power:power,
			efficiency:efficiency
		});
	},
	clearLasers:function(lasers){
		lasers.length=0;
	},
	checkCollisions:function(dt){
		this.lasers.forEach(function(laser){
			var obj; //the chosen object
			var tValOfObj = Number.MAX_VALUE;
			var xInv = laser.endX<laser.startX;
			var yInv = laser.endY<laser.startY;
			var start = [(xInv) ? laser.endX : laser.startX, (yInv) ? laser.endY : laser.startY];
			var end = [(xInv) ? laser.startX : laser.endX, (yInv) ? laser.startY : laser.endY];
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
			for(var c = -1;c<this.otherShips.length;c++){
				var thisObj = ((c==-1) ? this.ship : this.otherShips[c]); //lol
				if(thisObj.x + thisObj.destructible.radius<start[0] || thisObj.x-thisObj.destructible.radius>end[0] || thisObj.y + thisObj.destructible.radius<start[1] || thisObj.y-thisObj.destructible.radius>end[1])
					continue;
				var thisDistance = distanceFromPointToLine(thisObj.x,thisObj.y,laser.startX,laser.startY,laser.endX,laser.endY);
				if(thisDistance[0]<thisObj.destructible.radius && thisDistance[1]<tValOfObj){
					obj = thisObj;
					tValOfObj = thisDistance[1];
				}
			}
			if(obj)
			{
				obj.destructible.shield.current-=laser.power*dt;
				if(obj.destructible.shield.current<0)
				{
					obj.destructible.hp+=obj.destructible.shield.current;
					obj.destructible.shield.current = 0;
				}
				console.log(obj+' hp: '+obj.destructible.hp);
				var laserDir = [laser.endX-laser.startX,laser.endY-laser.startY];
				var newEnd = [laser.startX+tValOfObj*laserDir[0],laser.startY+tValOfObj*laserDir[1]];
				laser.endX = newEnd[0];
				laser.endY = newEnd[1];
			}
		},this);

		for(var c = -1;c<this.otherShips.length;c++){
			var ship = (c==-1)? this.ship:this.otherShips[c];
			for(var c = 0;c<this.asteroids.objs.length;c++){
				var asteroid = this.asteroids.objs[c];
				var distance = (ship.x-asteroid.x)*(ship.x-asteroid.x) + (ship.y-asteroid.y)*(ship.y-asteroid.y);
				var overlap = (ship.destructible.radius+asteroid.radius)*(ship.destructible.radius+asteroid.radius) - distance;
				if(overlap>=0)
				{
					ship.destructible.shield.current-=15*dt;
					if(ship.destructible.shield.current<0)
					{
						ship.destructible.hp+=ship.destructible.shield.current;
						ship.destructible.shield.current = 0;
					}
				}
			}
		}
	},
	drawLasers:function(lasers,camera){
		var ctx = camera.ctx;
		lasers.forEach(function(laser){
			var start = worldPointToCameraSpace(laser.startX,laser.startY,camera);
			var end = worldPointToCameraSpace(laser.endX,laser.endY,camera);
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
	clearDestructibles:function(destructibles){
		for(var c = 0;c<destructibles.length;c++){
			if(destructibles[c].destructible.hp<=0)
				destructibles.splice(c--,1);
		}
	},
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
	//draws asteroids from the given asteroids array to the given camera
	drawStars: function(stars,camera){
		var start = [0,0];
		var end = [camera.width,camera.height];
		var ctx = camera.ctx;
		for(var c = 0;c<stars.length;c++){
			var star = stars[c];
			ctx.save();
			var finalPosition = worldPointToCameraSpace(star.x,star.y,camera); //get asteroid's position in camera space
			if(finalPosition[0] + star.radius*camera.zoom<start[0] || finalPosition[0]-star.radius*camera.zoom>end[0] || finalPosition[1] + star.radius*camera.zoom<start[1] || finalPosition[1]-star.radius*camera.zoom>end[1])
					continue;
			ctx.translate(finalPosition[0],finalPosition[1]); //translate to that position
			ctx.scale(camera.zoom,camera.zoom); //scale to zoom
			ctx.beginPath();
			ctx.arc(0,0,star.radius,0,Math.PI*2);
			ctx.globalAlpha = .5;
			ctx.fillStyle = star.color;
			ctx.fill();
			ctx.restore();
		};
	},
	clearShips:function(ships){
		for(var c = 0;c<ships.length;c++){
			if(ships[c].destructible.hp<=0)
				ships.splice(c--,1);
		}
	},
	//the game loop
	update: function(){
		//queue our next frame
	 	this.animationID = requestAnimationFrame(this.update.bind(this));
	 	var dt = this.calculateDeltaTime(); //delta for physics		

	 	//clear values
		this.clearLasers(this.lasers);
		for(var c =-1;c<this.otherShips.length;c++){
			var ship = (c==-1) ? this.ship : this.otherShips[c];
			this.shipClearThrusters(ship);
			this.shipClearPowerTarget(ship);
		}
		this.clearDestructibles(this.asteroids.objs);
		this.clearDestructibles(this.otherShips);

		//pause screen
	 	if(this.gameState == this.GAME_STATES.PLAYING && this.paused){
	 		dt = 0;
	 		this.drawPauseScreen(this.camera);
	 		//this.drawPauseScreen(this.worldCamera);
	 		return;
	 	} 

		if(this.otherShips.length==0 && this.gameState==this.GAME_STATES.PLAYING)
			this.gameState = this.GAME_STATES.WIN;
		else if(this.gameState == this.GAME_STATES.PLAYING && this.ship.destructible.hp<=0)
			this.gameState = this.GAME_STATES.LOSE;
		else if(this.gameState == this.GAME_STATES.PLAYING){

			this.otherShips.forEach(function(ship){
				//this.shipAI(ship,this.ship,dt);
			},this);

			//set ship thruster values
		 	//assisted controls
			//medial motion
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_W])
				this.shipMedialThrusters(this.ship,this.ship.thrusters.medial.maxStrength/this.ship.stabilizer.thrustRatio);
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_S])
				this.shipMedialThrusters(this.ship,-this.ship.thrusters.medial.maxStrength/this.ship.stabilizer.thrustRatio);
			if(this.ship.stabilizer.enabled)
				this.shipMedialStabilizers(this.ship,dt);
			//lateral motion
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_A])
				this.shipLateralThrusters(this.ship,-this.ship.thrusters.lateral.maxStrength/this.ship.stabilizer.thrustRatio);
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_D])
				this.shipLateralThrusters(this.ship,this.ship.thrusters.lateral.maxStrength/this.ship.stabilizer.thrustRatio);
			if(this.ship.stabilizer.enabled)
				this.shipLateralStabilizers(this.ship,dt);
			//rotational motion
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_LEFT])
				this.shipRotationalThrusters(this.ship,this.ship.thrusters.rotational.maxStrength/this.ship.stabilizer.thrustRatio);
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_RIGHT])
				this.shipRotationalThrusters(this.ship,-this.ship.thrusters.rotational.maxStrength/this.ship.stabilizer.thrustRatio);
			if(this.ship.stabilizer.enabled)
				this.shipRotationalStabilizers(this.ship,dt);
			//lasers
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_SPACE])
				this.shipFireLaser(this.ship);
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_SHIFT])
				this.ship.powerSystem.target[this.SHIP_COMPONENTS.THRUSTERS] = 1;
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_CTRL])
				this.ship.powerSystem.target[this.SHIP_COMPONENTS.LASERS] = 1;
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_ALT])
				this.ship.powerSystem.target[this.SHIP_COMPONENTS.SHIELDS] = 1;
		 	//camera zoom controls
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_UP] && this.camera.zoom<=this.camera.maxZoom)
				this.camera.zoom*=1.05;
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_DOWN] && this.camera.zoom>=this.camera.minZoom)
				this.camera.zoom*=.95;	 

		 	//update ship, center main camera on ship
			this.updateShip(this.ship,dt);
			this.otherShips.forEach(function(ship){
				this.updateShip(ship,dt);
			},this);

			this.checkCollisions(dt);				
		}
		else if(this.gameState == this.GAME_STATES.TITLE && myKeys.keydown[myKeys.KEYBOARD.KEY_W])
			this.gameState = this.GAME_STATES.PLAYING;
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

		//clear cameras
		this.clearCamera(this.camera);
		this.clearCamera(this.starCamera);

		//draw grids then asteroids then ships
		if(this.drawStarField)
			this.drawAsteroids(this.stars,this.starCamera);
		
		
		if(this.gameState == this.GAME_STATES.PLAYING)
		{
			this.drawGrid(this.gridCamera);
			this.drawAsteroidsOverlay(this.asteroids,this.camera,this.gridCamera);
			for(var n = this.otherShips.length-1;n>=-1;n--){
				var ship = (n==-1)?this.ship:this.otherShips[n];
				this.drawShipOverlay(ship,this.camera,this.gridCamera);
			}
			this.drawLasers(this.lasers, this.camera);
			for(var c = this.otherShips.length-1;c>=-1;c--){
				var ship = (c==-1)?this.ship:this.otherShips[c];
				this.drawShip(ship,this.camera);
			}
			
			this.drawAsteroids(this.asteroids,this.camera, this.gridCamera);
			this.drawHUD(this.camera);
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
		
		//FPS text
		if (this.debug){
			this.fillText(this.camera.ctx,'fps: '+Math.floor(1/dt),15,15,"10pt Aroma",'white');
		}

		//because we might use the frame count for something at some point
		this.frameCount++;
	},
	drawHUD: function(camera){
		var ctx = camera.ctx;
		ctx.save(); // NEW
		ctx.textAlign = 'left';
		ctx.textBaseline = 'center';
		this.fillText(ctx, "Shields: "+Math.round(this.ship.destructible.shield.current),camera.width/15,7.5*camera.height/10,"12pt Aroma",'white')
		this.fillText(ctx, "HP: "+Math.round(this.ship.destructible.hp),camera.width/15,8*camera.height/10,"12pt Aroma",'white')
		this.fillText(ctx, "Control mode: "+((this.ship.stabilizer.enabled)?'assisted':'manual'),camera.width/15,9*camera.height/10,"12pt Aroma",'white')
		this.fillText(ctx, "Thruster clamps: "+((this.ship.stabilizer.clamps.enabled)?'M'+Math.round(this.ship.stabilizer.clamps.medial)+' L'+Math.round(this.ship.stabilizer.clamps.lateral)+' R'+Math.round(this.ship.stabilizer.clamps.rotational):'disabled'),camera.width/15,9.5*camera.height/10,"12pt Aroma",'white')
		this.fillText(ctx, "Power Distribution: T "+Math.round(this.getPowerForComponent(this.ship.powerSystem,this.SHIP_COMPONENTS.THRUSTERS)*100)+'% L '+Math.round(this.getPowerForComponent(this.ship.powerSystem,this.SHIP_COMPONENTS.LASERS)*100)+'% S '+Math.round(this.getPowerForComponent(this.ship.powerSystem,this.SHIP_COMPONENTS.SHIELDS)*100)+'%',camera.width/15,9.7*camera.height/10,"12pt Aroma",'white')
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
		this.fillText(ctx,"Space Battle With Lasers",camera.width/2,camera.height/5,"bold 64pt Aroma",'blue',.5);
		this.fillText(ctx,"Space Battle With Lasers",camera.width/2,camera.height/5,"bold 24pt Aroma",'white');
		this.fillText(ctx,"Press W to start. Use WASD, LEFT/RIGHT/UP/DOWN, SPACE, and TAB to control your ship",camera.width/2,4*camera.height/5,"12pt Aroma",'white');
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
		this.fillText(ctx,"Good for you. Press R to continue.",camera.width/2,4*camera.height/5,"12pt Aroma",'white');
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
		this.fillText(ctx,"You lose!",camera.width/2,camera.height/5,"24pt courier",'white');
		this.fillText(ctx,"Sucks to be you. Press R to try again.",camera.width/2,4*camera.height/5,"12pt courier",'white');
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