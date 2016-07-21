"use strict"

var updaters = {
	updateRadial:function(radial, dt){
		radial.radius+=radial.velocity*dt;
		radial.velocity-=radial.velocity*radial.decay*dt;
	},
	updateThrusterSystem:function(ship,dt){
		//add acceleration from each thruster
			//medial
				var strength = ship.thrusters.medial.targetStrength;
				ship.thrusters.medial.targetStrength = 0; //clear target

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
					var fv = utilities.getForwardVector(ship);
					ship.accelerationX += fv[0]*strength;
					ship.accelerationY += fv[1]*strength;

			//lateral
				var strength = ship.thrusters.lateral.targetStrength;
				ship.thrusters.lateral.targetStrength = 0; //clear target

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
					var rv = utilities.getRightVector(ship);
					ship.accelerationX += rv[0]*strength;
					ship.accelerationY += rv[1]*strength;

			//rotational
				var strength = ship.thrusters.rotational.targetStrength;
				ship.thrusters.rotational.targetStrength = 0; //clear target

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
					ship.rotationalAcceleration = -strength;

		//thruster percentage for the sound effect
			var thrusterTotal = Math.abs(ship.thrusters.medial.currentStrength)+Math.abs(ship.thrusters.lateral.currentStrength)+Math.abs(ship.thrusters.rotational.currentStrength);
			var thrusterEfficiencyTotal = ship.thrusters.medial.efficiency+ship.thrusters.lateral.efficiency+ship.thrusters.rotational.efficiency;
			ship.thrusters.noiseLevel = (thrusterTotal/thrusterEfficiencyTotal);
	},

	updateMobile:function(obj, dt){
		//accelerate
			if(obj.hasOwnProperty("accelerationX") && obj.hasOwnProperty("accelerationY")){			
				obj.velocityX+=obj.accelerationX*dt;
				obj.accelerationX = 0;
				obj.velocityY+=obj.accelerationY*dt;
				obj.accelerationY = 0;
				if(obj.hasOwnProperty("rotationalVelocity") && obj.hasOwnProperty("rotationalAcceleration")){
					obj.rotationalVelocity+=obj.rotationalAcceleration*dt;
					obj.rotationalAcceleration = 0;
				}
				obj.medialVelocity = undefined;
				obj.lateralVelocity = undefined;
			}

		//move
			//store position at previous update for swept area construction
				//obj.prevX = obj.x;
				//obj.prevY = obj.y;
			obj.x+=obj.velocityX*dt;
			obj.y+=obj.velocityY*dt;
			if(obj.hasOwnProperty("rotation")){
				obj.rotation+=obj.rotationalVelocity*dt;
				if(obj.rotation>180)
					obj.rotation-=360;
				else if(obj.rotation<-180)
					obj.rotation+=360;
			}
			obj.forwardVectorX = undefined;
			obj.forwardVectorY = undefined;
			obj.rightVectorX = undefined;
			obj.rightVectorY = undefined;
			
	},

	updateLaserComponent:function(obj,dt){
		/*var forwardVector = utilities.getForwardVector(obj);
		//create laser objects
			var laserVector = [0,-obj.laser.range];
			laserVector = rotate(0,0,laserVector[0],laserVector[1],-obj.rotation+Math.random()*obj.laser.spread-obj.laser.spread/2);
			obj.laser.nextLaser = constructors.createLaser(obj.game.lasers,obj.x+forwardVector[0]*(30),obj.y+forwardVector[1]*30,obj.x+laserVector[0],obj.y+laserVector[1],obj.laser.color,obj.laser.currentPower, obj.laser.efficiency, obj.laser.nextLaser, obj, collisions[obj.laser.collisionFunction]);
			obj.laser.currentPower-=obj.laser.maxPower*(1-obj.laser.coherence)*dt*1000;
			if(obj.laser.currentPower<0)
				obj.laser.currentPower=0;*/

		var forwardVector = utilities.getForwardVector(obj);
		//var nextForwardVector = rotate(0,0,forwardVector[0], forwardVector[1], -obj.rotationalVelocity*dt);
		//create laser objects
			var spread = Math.random()*obj.laser.spread-obj.laser.spread/2;
			var laserVector = [0,-obj.laser.range];
			var currentLaserVector = rotate(0,0,laserVector[0],laserVector[1],-obj.rotation+spread);
			//var nextLaserVector = rotate(0,0,laserVector[0],laserVector[1],-(obj.rotation+obj.rotationalVelocity*dt)+spread);
			/*var nextLaser = {
				startX:obj.x+obj.velocityX*dt+nextForwardVector[0]*30,
				startY: obj.y+obj.velocityY*dt+nextForwardVector[1]*30,
				endX:obj.x+obj.velocityX*dt+nextLaserVector[0],
				endX:obj.x+obj.velocityX*dt+nextLaserVector[1]
			};*/
			if(obj.laser.currentPower>0) constructors.createHitscan(obj.game.hitscans,obj.x+forwardVector[0]*(30),obj.y+forwardVector[1]*30,obj.x+currentLaserVector[0],obj.y+currentLaserVector[1],obj.laser.color,obj.laser.currentPower, obj.laser.efficiency, obj, collisions[obj.laser.collisionFunction]);
			obj.laser.currentPower -= obj.laser.maxPower*(1-obj.laser.coherence)*dt*1000;
			if(obj.laser.currentPower<0)
				obj.laser.currentPower=0;
	},

	

	updateCannonComponent:function(obj,dt){
		var forwardVector = utilities.getForwardVector(obj);
		//create projectiles
			if(obj.cannon.firing){
				//var forwardVector = this.getForwardVector(obj);
				var prjVelocity = [forwardVector[0] * obj.cannon.power, forwardVector[1] * obj.cannon.power];
				var ammo = obj.cannon.ammo;
				constructors.createProjectile(obj.game.projectiles, obj.x+forwardVector[0]*(30), obj.y+forwardVector[1]*30, prjVelocity[0] + obj.velocityX, prjVelocity[1] + obj.velocityY, constructors.createComponentDestructible(ammo.destructible), ammo.color, obj, ammo.tracerSeed%ammo.tracerInterval==0, collisions[ammo.collisionFunction]);
				obj.cannon.firing = false;
				ammo.tracerSeed++;
			}
	},

	updateLauncherComponent:function(obj, dt){
		if(obj.launcher.firing){
			//var now = Date.now();
			var launchee = deepObjectMerge({},obj.launcher.tubes[0].ammo);
			launchee.x = obj.x, launchee.y = obj.y, launchee.velocityX = obj.velocityX, launchee.velocityY = obj.velocityY, launchee.rotation = obj.rotation, launchee.color = obj.color, launchee.specialProperties = {owner:obj};
			obj.game.otherShips.push(constructors.createShip(launchee, obj.game));
			obj.launcher.firing = false;
		}
	},

	updateShieldComponent:function(obj,dt){
		//refresh shields
			if(obj.destructible.shield.current<obj.destructible.shield.max)
			{
				obj.destructible.shield.current+=obj.destructible.shield.recharge*dt;
				if(obj.destructible.shield.current>obj.destructible.shield.max)
					obj.destructible.shield.current = obj.destructible.shield.max;
			}
	},

	updatePowerSystem:function(obj,dt){
		//update power system
			//scale all relevant values down from the augmented to their normal using the old power values
				var thrusterPower = updaters.getPowerForComponent(obj.powerSystem, enums.SHIP_COMPONENTS.THRUSTERS);
				var laserPower = updaters.getPowerForComponent(obj.powerSystem, enums.SHIP_COMPONENTS.LASERS);
				var shieldPower = updaters.getPowerForComponent(obj.powerSystem, enums.SHIP_COMPONENTS.SHIELDS);
				//thrusters
					obj.thrusters.medial.maxStrength/=(1+thrusterPower);
					obj.thrusters.lateral.maxStrength/=(1+thrusterPower);
					obj.thrusters.rotational.maxStrength/=(1+thrusterPower);
					obj.stabilizer.clamps.medial/=(1+thrusterPower);
					obj.stabilizer.clamps.lateral/=(1+thrusterPower);
					obj.stabilizer.clamps.rotational/=(1+thrusterPower);
				//lasers
					if(obj.hasOwnProperty("laser"))
						obj.laser.maxPower/=(1+laserPower);
				//shields
					obj.destructible.shield.current/=(1+shieldPower);
					obj.destructible.shield.max/=(1+shieldPower);
					obj.destructible.shield.recharge/=(1+shieldPower);

			//update the power values
				updaters.scalePowerTarget(obj.powerSystem);
				obj.powerSystem.current = lerpNd(obj.powerSystem.current,obj.powerSystem.target,obj.powerSystem.transferRate*dt);

				//clear power target
				for(var c = 0; c<obj.powerSystem.target.length;c++){
					obj.powerSystem.target[c] = 0;
				}

			//scale back up to augmented with the new power values
				thrusterPower = updaters.getPowerForComponent(obj.powerSystem, enums.SHIP_COMPONENTS.THRUSTERS);
				laserPower = updaters.getPowerForComponent(obj.powerSystem, enums.SHIP_COMPONENTS.LASERS);
				shieldPower = updaters.getPowerForComponent(obj.powerSystem, enums.SHIP_COMPONENTS.SHIELDS);
				//thrusters
					obj.thrusters.medial.maxStrength*=(1+thrusterPower);
					obj.thrusters.lateral.maxStrength*=(1+thrusterPower);
					obj.thrusters.rotational.maxStrength*=(1+thrusterPower);
					obj.stabilizer.clamps.medial*=(1+thrusterPower);
					obj.stabilizer.clamps.lateral*=(1+thrusterPower);
					obj.stabilizer.clamps.rotational*=(1+thrusterPower);
				//lasers
					if(obj.hasOwnProperty("laser"))
						obj.laser.maxPower*=(1+laserPower);
				//shields
					obj.destructible.shield.current*=(1+shieldPower);
					obj.destructible.shield.max*=(1+shieldPower);
					obj.destructible.shield.recharge*=(1+shieldPower);
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

	updateAiComponent:function(obj, dt){
		var aiF = aiFunctions[obj.ai.aiFunction];
		aiF(obj, dt);
	},

	updateUpdatable:function(obj,dt){
		var test = this;
		for(var c = 0;c<obj.updaters.length;c++){
			//obj.updaters[c].bind(updaters)(obj,dt);
			obj.updaters[c](obj,dt);
		}
	},

	populateUpdaters:function(obj){
		var updateFunctions = [];

		if(obj.hasOwnProperty("velocityX") && obj.hasOwnProperty("velocityY"))
			updateFunctions.push(updaters.updateMobile);
		if(obj.ai)
			updateFunctions.push(updaters.updateAiComponent);
		if(obj.thrusters)
			updateFunctions.push(updaters.updateThrusterSystem);
		if(obj.laser)
			updateFunctions.push(updaters.updateLaserComponent);
		if(obj.cannon)
			updateFunctions.push(updaters.updateCannonComponent);
		if(obj.destructible && obj.destructible.shield.recharge>0)
			updateFunctions.push(updaters.updateShieldComponent);
		if(obj.powerSystem)
			updateFunctions.push(updaters.updatePowerSystem);
		if(obj.launcher)
			updateFunctions.push(updaters.updateLauncherComponent);

		obj.updaters = updateFunctions;
	},

	populateOnDestroy:function(obj){
		var onDestroyFunctions = [];
		if(obj.warhead)
			onDestroyFunctions.push(destructors.destroyWarhead);

		obj.onDestroy = onDestroyFunctions;
	}
};

var clearFunctions = {
	//destroys any members of the given destructible array that are outside the given grid by more than the tolerance
	cullDestructibles: function(destructibles, grid){
		var gridDimensions = grid.gridLines * grid.gridSpacing;
		var tolerancePercent;
		for(var c = 0;c<destructibles.length;c++){
			if(!destructibles[c].hasOwnProperty("cullTolerance"))
				continue;
			tolerancePercent = destructibles[c].cullTolerance;
			var tolerances = [gridDimensions * tolerancePercent, gridDimensions * tolerancePercent];
			var position = [destructibles[c].x, destructibles[c].y];
			if(!gridFunctions.isPositionInGrid(position, grid, tolerances))
				destructibles.splice(c--,1);
		}
	},

	//destroys any members of the given destructible array that have zero or less hp
	clearDestructibles:function(destructibles){
		for(var c = 0;c<destructibles.length;c++){
			if(destructibles[c].destructible.hp<=0)
			{
				if(destructibles[c].onDestroy)
					for(var i = 0; i <destructibles[c].onDestroy.length; i++)
						destructibles[c].onDestroy[i](destructibles[c]);
				destructibles.splice(c--,1);
			}
		}
	},

	clearRadials:function(radials){
		for(var c = 0;c<radials.length;c++){
			if(radials[c].velocity<=5)
				radials.splice(c--,1);
		}
	},

	clearHitscans:function(hitscans){
		hitscans.length=0;
	},

	clearProjectiles: function(projectiles){
		projectiles.length = 0;
	},
};

var collisions = {
	basicLaserCollision:function(laser, obj, tValOfObj, dt){
		obj.destructible.shield.current-=laser.power*dt*(1-tValOfObj);
		//console.log('damage: '+laser.power*dt*(1-tValOfObj));
		if(obj.destructible.shield.current<0)
		{
			obj.destructible.hp+=obj.destructible.shield.current;
			obj.destructible.shield.current = 0;
		}
		console.log('hp: '+Math.round(obj.destructible.hp)+'/'+Math.round(obj.destructible.maxHp)+', damage: '+Math.round(laser.power*dt*(1-tValOfObj)));
		var laserDir = [laser.endX-laser.startX,laser.endY-laser.startY];
		var newEnd = [laser.startX+tValOfObj*laserDir[0],laser.startY+tValOfObj*laserDir[1]];
		laser.endX = newEnd[0];
		laser.endY = newEnd[1];
	},

	basicKineticCollision:function(collider, collidee, dt){
		var LIMITINGSIZEFACTOR = 10;
		var objVel = [(collidee.velocityX)?collidee.velocityX:0,(collidee.velocityY)?collidee.velocityY:0];
		var velocityDifference = [collider.velocityX - objVel[0], collider.velocityY - objVel[1]];
		var magnitude = Math.sqrt(velocityDifference[0] * velocityDifference[0] + velocityDifference[1] * velocityDifference[1]);
		var damage = dt * magnitude/200;// * collider.destructible.maxHp;// * collider.destructible.radius/collidee.destructible.radius;
		//console.log('collision damage: '+damage);
		//collider.destructible.hp-=damage;
		var colliderSizeCoeff = LIMITINGSIZEFACTOR*collidee.destructible.radius/collider.destructible.radius;
		var colliderDamage = clamp(0,damage * collidee.destructible.maxHp,colliderSizeCoeff*collider.destructible.maxHp);// * collidee.destructible.radius/collider.destructible.radius;
		collider.destructible.shield.current-= colliderDamage;
		if(collider.destructible.shield.current<0)
		{
			collider.destructible.hp+=collider.destructible.shield.current;
			collider.destructible.shield.current = 0;
		}
		var collideeSizeCoeff = LIMITINGSIZEFACTOR*collider.destructible.radius/collidee.destructible.radius;
		var collideeDamage = clamp(0,damage * collider.destructible.maxHp,collideeSizeCoeff*collidee.destructible.maxHp);// * collider.destructible.radius/collidee.destructible.radius;
		collidee.destructible.shield.current-= collideeDamage;
		if(collidee.destructible.shield.current<0)
		{
			collidee.destructible.hp+=collidee.destructible.shield.current;
			collidee.destructible.shield.current = 0;
		}

		console.log('collider'+Math.round(collider.destructible.radius)+' damage: '+colliderDamage+'\ncollidee '+Math.round(collidee.destructible.radius)+' damage: '+collideeDamage);
	}
};