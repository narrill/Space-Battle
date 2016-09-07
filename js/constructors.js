"use strict"

var constructors = {
	createPlayer:function(objectParams, game){
		var pl = {
			socket:objectParams.socket,
			game:undefined,
			lastSpawn:0,
			currentShip:undefined
		};
		veryShallowObjectMerge(pl, objectParams);
		return pl;
	},

	//constructor for ship objects
	createShip:function(objectParams, game){
		if(!objectParams)
			objectParams = {};
		var gridPosition = gridFunctions.randomGridPosition(game.grid);
		var ship = {
			id:server.takeIdTag(),
			game:game,
			faction:-1,
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
			thrusterSystem:constructors.createComponentThrusterSystem(deepObjectMerge({},objectParams.thrusters)),
			//colors
			color:getRandomBrightColor(),
			//model
			model:(objectParams.hasOwnProperty("model"))?objectParams.model:ships.cheetah.model,
			weaponToggle:true,
			/*onDestroy:function(obj){
				constructors.createRadial(obj.game.radials,obj.x, obj.y, 500, .99, 'red', obj, undefined, {});
			}*/
			constructionObject:deepObjectMerge({},objectParams),
			type:'obj'
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

		if(ship.faction != -1)
			ship.color = game.factionColors[ship.faction];

		//updaters.populateUpdaters(ship);
		ship.updaters = [];
		ship.updaters.push(updaters.updateMobile);
		ship.updaters.push(updaters.queueReport);
		for(var key in ship)
		{
			var capitalized = key.charAt(0).toUpperCase() + key.slice(1);
			var updater = updaters['update'+capitalized+'Component'];
			if(updater)
				ship.updaters.push(updater);
		}

		updaters.populateOnDestroy(ship);

		//this.updatables.push(ship);

		return ship;
	},

	//constructor for the thruster system component
	createComponentThrusterSystem:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var ts = {
			id:server.takeIdTag(),
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
			id:server.takeIdTag(),
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
			id:server.takeIdTag(),
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
			id:server.takeIdTag(),
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
			id:server.takeIdTag(),
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
			id:server.takeIdTag(),
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
			id:server.takeIdTag(),
			firing:false,
			lastFireTime:0,
			cd:.12,
			power:96000,
			ammo:constructors.createComponentAmmo(deepObjectMerge({},objectParams.ammo))
		};

		veryShallowObjectMerge(cn, objectParams);

		return cn;
	},

	createComponentAmmo:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var am = {
			id:server.takeIdTag(),
			destructible:constructors.createComponentDestructible(deepObjectMerge({
				hp:15,
				radius:3
			},objectParams.destructible)),
			color:'yellow',
			tracerInterval:1,
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
			id:server.takeIdTag(),
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
			id:server.takeIdTag(),
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
			id:server.takeIdTag(),
			radial:deepObjectMerge({
				velocity:1000,
				decay:.99,
				color:'red',
				collisionProperties:{
					density:8
				},
				collisionFunction:"basicBlastwaveCollision"
			},objectParams.radial)
		};

		return wh;
	},

	//constructor for the destructible component - stores hp, shields, and collider radius
	createComponentDestructible:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var ds = {
			id:server.takeIdTag(),
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
			id:server.takeIdTag(),
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
			id:server.takeIdTag(),
			aiFunction:undefined
		};

		veryShallowObjectMerge(ai, objectParams);

		return ai;
	},

	createComponentRemoteInput:function(objectParams){
		var ri = {
			id:server.takeIdTag(),
			keyboard:[],
			mouse:[],
			mouseDirection:0,
			messageHandler:mh,
			lastSend:0,
			sendInterval:12.5
		};
		function mh(data){
			if(data.disconnect && ri.remoteSend)
				delete ri.remoteSend;
			if(data.keyCode)
				ri.keyboard[data.keyCode] = data.pos;
			if(data.mb || data.mb==0)
				ri.mouse[data.mb] = data.pos;
			if(data.md || data.md==0)
				ri.mouseDirection = lerp(ri.mouseDirection, data.md, .5);
		}
		veryShallowObjectMerge(ri,objectParams);
		return ri;
	},

	//constructor for viewport component
	createComponentViewport:function(objectParams){
		if(!objectParams)
			objectParams = {};
		var vp = veryShallowObjectMerge({
			startX:0,
			startY:0,
			endX:1,
			endY:1
		}, objectParams);
		vp.parent = objectParams.parent;
		return vp;
	},

	//constructor for laser object
	createHitscan:function(game, startX,startY,endX,endY,color, owner, collisionFunction, collisionProperties,id){
		var hitscan = {
			id:id,
			startX:startX,
			startY:startY,
			endX:endX,
			endY:endY,
			color:color,
			//previousLaser:previousLaser,
			owner:owner,
			velocityX:owner.velocityX,
			velocityY:owner.velocityY,
			collisionFunction:collisionFunction,
			type:'hitscan'
		};

		if(collisionProperties) veryShallowObjectMerge(hitscan, collisionProperties);
		//lsr.nextLaser = constructors.createNextLaserObject(lsr)
		if(game.hitscans) game.hitscans.push(hitscan);
		return hitscan;
	},

	//constructor for projectile object
	createProjectile:function(game, startX, startY, velX, velY, destructible, color, owner, visible, collisionFunction){
		var prj = {
			id:server.takeIdTag(),
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
			collisionFunction:collisionFunction,
			type:'prj'
		};
		game.projectiles.push(prj);
	},

	createRadial:function(game, x, y, vel, decay, color, owner, collisionFunction, collisionProperties){
		var rad = {
			id:server.takeIdTag(),
			x:x,
			y:y,
			radius:0,
			velocity:vel,
			decay:decay,
			color:color,
			owner:owner,
			collisionFunction:collisionFunction,
			collisionProperties:collisionProperties,
			type:'radial'
		};
		game.radials.push(rad);
	},

	//returns a camera object with the given values and the context from the given canvas
	createCamera:function(canvas, objectParams){
		if(!objectParams)
			objectParams = {};
		var cam = {
			x:(objectParams.x) ? objectParams.x : 0,
			y:(objectParams.y) ? objectParams.y : 0,
			rotation:(objectParams.rotation) ? objectParams.rotation : 0,
			zoom: (objectParams.zoom) ? objectParams.zoom : 1,
			minZoom:(objectParams.minZoom)?objectParams.minZoom:0,
			maxZoom:(objectParams.maxZoom)?objectParams.maxZoom:Number.MAX_VALUE,
			viewport:constructors.createComponentViewport(objectParams.viewport),
			get width(){
				return canvas.width;
			},
			get height(){
				return canvas.height;
			},
			ctx:canvas.getContext('2d')
		};
		return cam;
	},

	//generates the field of asteroids
	makeAsteroids:function(game, grid){
		var asteroids = game.asteroids;
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
				colorIndex:group,
				game:game,
				type:'asteroid'
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
			var group = Math.floor(Math.random()*stars.colors.length);
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
		constructors.createRadial(obj.game, obj.x, obj.y, radial.velocity, radial.decay, radial.color, obj, collisions[radial.collisionFunction], radial.collisionProperties);
	},
	queueRespawn:function(obj){
		obj.game.respawnQueue.push({time:obj.game.elapsedGameTime+obj.respawnTime*1000,params:obj.constructionObject});
	},
	destroyRemoteInput:function(obj){
		obj.remoteInput.remoteSend({destroyed:true});
	},
	returnIdTag:function(src){
		if(!src)
			return;
		//loop through source's attributes
		for(var key in src){
			//if the attribute is up the prototype chain, skip it
			if(!src.hasOwnProperty(key))
				continue;
			//if the current attribute is an object in the source
			if(src[key] instanceof Object && !(src[key] instanceof Array))
			{
				//then deep merge the two
				destructors.returnIdTag(src[key]);
			}
			else if(key=='id' && server.idDictionary[src[key]])
				delete server.idDictionary[src[key]];
		}
	}

};