"use strict"

var constructors = {
	//constructor for ship objects
	createShip:function(objectParams, game){
		if(!objectParams)
			objectParams = {};
		var gridPosition = gridFunctions.randomGridPosition(game.grid);
		var ship = {
			game:game,
			//position/rotation
			x:gridPosition.x,
			y:gridPosition.y,
			rotation:0,
			prevX: (objectParams.hasOwnProperty("x"))?objectParams.x: gridPosition.x,
			prevY: (objectParams.hasOwnProperty("y"))?objectParams.y: gridPosition.y,
			//velocities
			velocityX:0, //in absolute form, used for movement
			velocityY:0,
			accelerationX:0,
			accelerationY:0,
			rotationalVelocity:0,
			rotationalAcceleration:0,
			forwardVectorX:undefined,
			forwardVectorY:undefined,
			rightVectorX:undefined,
			rightVectorY:undefined,
			medialVelocity:undefined, //component form, used by stabilizers
			lateralVelocity:undefined,
			destructible:constructors.createComponentDestructible(deepObjectMerge({
				hp:100,
				radius:25,
				shield:{
					max:100,
					recharge:3,
					efficiency:8
				}
			}, objectParams.destructible)),
			thrusters:constructors.createComponentThrusterSystem(deepObjectMerge({},objectParams.thrusters)),
			//colors
			color:getRandomBrightColor(),
			//model
			model:(objectParams.hasOwnProperty("model"))?objectParams.model:ships.cheetah.model,
			weaponToggle:true,
			/*onDestroy:function(obj){
				constructors.createRadial(obj.game.radials,obj.x, obj.y, 500, .99, 'red', obj, undefined, {});
			}*/
		};

		//this is for adding additional components. also it's super janky
		//iterate through params
		for(var key in objectParams)
			//if params contains something ship doesn't
			if(!ship.hasOwnProperty(key))
			{
				//capitalize the first letter and try to find a constructor for it
				var capitalized = key.charAt(0).toUpperCase() + key.slice(1);
				var constructor = constructors['createComponent'+capitalized];
				//if a constructor was found, call it
				if(constructor) ship[key] = constructor(deepObjectMerge({}, objectParams[key]));
				//else if(key=='specialProperties')
				//	ship.specialProperties = objectParams[key];
			}

		//deepObjectMerge(ship, defaults);
		veryShallowObjectMerge(ship, objectParams);

		updaters.populateUpdaters(ship);

		updaters.populateOnDestroy(ship);

		//this.updatables.push(ship);

		return ship;
	},

	//constructor for the thruster system component
	createComponentThrusterSystem:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var ts = {
			color:getRandomBrightColor(),
			noiseLevel:0,
			medial:constructors.createComponentThruster(deepObjectMerge({
				maxStrength:3000,
				efficiency:1000
			},objectParams.medial)),
			lateral:constructors.createComponentThruster(deepObjectMerge({
				maxStrength:2000,
				efficiency:1000
			}, objectParams.lateral)),
			rotational:constructors.createComponentThruster(deepObjectMerge({
				maxStrength:750,
				efficiency:1000
			}, objectParams.rotational))
		};

		veryShallowObjectMerge(ts, objectParams);

		return ts;
	},

	//constructor for the thruster component
	createComponentThruster:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var t = {
			currentStrength:0,
			targetStrength:0,
			maxStrength: 1000,
			efficiency: 1000,
			powerRampPercentage: 20,
			powerRampLimit: 6000
		};

		veryShallowObjectMerge(t, objectParams);

		return t;
	},

	//constructor for the power system component
	createComponentPowerSystem:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var ps = {
			current:[0,0,0],
			target:[0,0,0],
			transferRate:6
		};

		veryShallowObjectMerge(ps, objectParams);

		return ps;
	},

	//constructor for the stabilizer component
	createComponentStabilizer:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var stab = {
			enabled: true,
			strength: 1200,
			thrustRatio: 1.5,
			precision: 10,
			clamps: constructors.createComponentStabilizerClamps(deepObjectMerge({},objectParams.clamps))
		};

		veryShallowObjectMerge(stab, objectParams);

		return stab;
	},

	//constructor for the stabilizer clamps sub-component
	createComponentStabilizerClamps:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var clamps = {
			enabled: true,
			medial:3000,
			lateral:2000,
			rotational:90
		};

		veryShallowObjectMerge(clamps, objectParams);
		return clamps;
	},

	//constructor for the laser component
	createComponentLaser:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var lsr = {
			lastFireTime:0,
			cd:.3,
			range:10000,
			color:getRandomBrightColor(),
			currentPower:0,
			coherence:.995,
			maxPower:6000,
			efficiency:200,
			spread:0,
			collisionFunction:"basicLaserCollision"
		};

		veryShallowObjectMerge(lsr, objectParams);

		return lsr;
	},

	//constructor for cannon component
	createComponentCannon:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var cn = {
			firing:false,
			lastFireTime:0,
			cd:.02,
			power:24000,
			ammo:constructors.createComponentAmmo(deepObjectMerge({},objectParams.ammo))
		};

		veryShallowObjectMerge(cn, objectParams);

		return cn;
	},

	createComponentAmmo:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var am = {
			destructible:constructors.createComponentDestructible(deepObjectMerge({
				hp:50,
				radius:.5
			},objectParams.destructible)),
			color:'yellow',
			tracerInterval:5,
			tracerSeed:0,
			collisionFunction:"basicKineticCollision"
		};

		veryShallowObjectMerge(am, objectParams);

		return am;
	},

	createComponentLauncher:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var ln = {
			tubes:[
				{ammo:missiles.tomcat, lastFireTime:0}
			],
			firing:false,
			cd:4,
			fireInterval:.1,
			lastFireTime:0
		};

		veryShallowObjectMerge(ln, objectParams);

		return ln;
	},

	createComponentTargetingSystem:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var ts = {
			targets:[],
			maxTargets:1,
			range:50000,
			lockConeWidth:45,
			lockTime:3,
			lockedTargets:[]
		};

		veryShallowObjectMerge(ts, objectParams);

		return ts;
	},

	createComponentWarhead:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var wh = {
			radial:deepObjectMerge({
				velocity:1000,
				decay:.99,
				color:'red',
				collisionProperties:{
					power:1
				},
				collisionFunction:"basicWarheadCollision"
			},objectParams.radial)
		};

		return wh;
	},

	//constructor for the destructible component - stores hp, shields, and collider radius
	createComponentDestructible:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var ds = {
			hp:500,
			maxHp: (objectParams.hp)?objectParams.hp: 500,
			radius:500,
			shield:constructors.createComponentDestructibleShield(deepObjectMerge({}, objectParams.shield)),
		};

		veryShallowObjectMerge(ds, objectParams);

		return ds;
	},

	//constructor for the shield sub-component
	createComponentDestructibleShield:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var sh = {
			current:(objectParams.max)?objectParams.max: 0,
			max:0,
			efficiency:0,
			recharge:0
		};

		veryShallowObjectMerge(sh, objectParams);

		return sh;
	},

	//constructor for the AI component
	createComponentAi:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var ai = {
			aiFunction:undefined
		};

		veryShallowObjectMerge(ai, objectParams);

		return ai;
	},

	//constructor for viewport component
	createComponentViewport:function(objectParams){
		if(!objectParams)
			objectParams = {};
		return veryShallowObjectMerge({
			startX:0,
			startY:0,
			endX:1,
			endY:1
		}, objectParams);
	},

	//constructor for laser object
	createHitscan:function(hitscans, startX,startY,endX,endY,color, owner, collisionFunction, collisionProperties){
		var hitscan = {
			startX:startX,
			startY:startY,
			endX:endX,
			endY:endY,
			color:color,
			//previousLaser:previousLaser,
			owner:owner,
			collisionFunction:collisionFunction
		};

		if(collisionProperties) veryShallowObjectMerge(hitscan, collisionProperties);
		//lsr.nextLaser = constructors.createNextLaserObject(lsr)
		if(hitscans) hitscans.push(hitscan);
		return hitscan;
	},

	createNextHitscanObject:function(hitscan, dt){
		var obj = hitscan.owner;
		//var anchorPoint = [hitscan.startX - obj.x, hitscan.startY - obj.y];
		var nextEnd = rotate(obj.x, obj.y, hitscan.endX, hitscan.endY, -obj.rotationalVelocity*dt);
		var nextStart = rotate(obj.x, obj.y, hitscan.startX, hitscan.startY, -obj.rotationalVelocity*dt);
		nextStart[0]+=obj.velocityX*dt;
		nextStart[1]+=obj.velocityY*dt;
		nextEnd[0]+=obj.velocityX*dt;
		nextEnd[1]+=obj.velocityY*dt;
		return {
			startX:nextStart[0],
			startY:nextStart[1],
			endX:nextEnd[0],
			endY:nextEnd[1]
		};
	},

	//constructor for projectile object
	createProjectile:function(projectiles, startX, startY, velX, velY, destructible, color, owner, visible, collisionFunction){
		var prj = {
			cullTolerance:.3,
			x:startX,
			y:startY,
			prevX:startX,
			prevY:startY,
			velocityX:velX,
			velocityY:velY,
			destructible:destructible,
			color:color,
			owner:owner,
			visible: visible,
			collisionFunction:collisionFunction
		};
		projectiles.push(prj);
	},

	createRadial:function(radials, x, y, vel, decay, color, owner, collisionFunction, collisionProperties){
		var rad = {
			x:x,
			y:y,
			radius:0,
			velocity:vel,
			decay:decay,
			color:color,
			owner:owner,
			collisionFunction:collisionFunction,
			collisionProperties:collisionProperties
		};
		radials.push(rad);
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
			viewport:constructors.createComponentViewport(objectParams.viewport),
			width:canvas.width,
			height:canvas.height,
			ctx:canvas.getContext('2d')
		};
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
				destructible:constructors.createComponentDestructible({
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
};

var destructors = {
	destroyWarhead:function(obj){
		var radial = obj.warhead.radial;
		constructors.createRadial(obj.game.radials, obj.x, obj.y, radial.velocity, radial.decay, radial.color, obj, radial.collisionFunction, radial.collisionProperties);
	}
};