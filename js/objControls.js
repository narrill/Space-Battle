"use strict"

var objControls = {
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
			objControls.shipRotationalThrusters(ship,ship.rotationalVelocity*ship.stabilizer.strength*dt); //we check the direction because the stabilizers can apply more thrust than the player
		//or, if we've exceeded our clamp speed and are trying to keep accelerating in that direction
		else if (ship.stabilizer.clamps.enabled && Math.abs(ship.rotationalVelocity)>=ship.stabilizer.clamps.rotational && ship.thrusters.rotational.targetStrength*ship.rotationalVelocity<0)
			//shut off the thruster
			ship.thrusters.rotational.targetStrength = 0;
	},

	//medial stabilizer
	shipMedialStabilizers:function(ship,dt){
		//if the main thruster isn't active, or is working against our velocity
		var medialVelocity = utilities.getMedialVelocity(ship);
		if(ship.thrusters.medial.targetStrength*medialVelocity>=0 && Math.abs(medialVelocity) > ship.stabilizer.precision)
			//add corrective strength
			objControls.shipMedialThrusters(ship,medialVelocity*ship.stabilizer.strength*dt);
		//or, if we're past our clamp and trying to keep going
		else if (ship.stabilizer.clamps.enabled && Math.abs(medialVelocity)>=ship.stabilizer.clamps.medial && ship.thrusters.medial.targetStrength*medialVelocity<0)
			//shut off the thruster
			ship.thrusters.medial.targetStrength = 0;
	},

	//lateral stabilizer
	shipLateralStabilizers:function(ship,dt){
		//see above
		var lateralVelocity = utilities.getLateralVelocity(ship);
		if(ship.thrusters.lateral.targetStrength*lateralVelocity>=0 && Math.abs(lateralVelocity) > ship.stabilizer.precision)
			objControls.shipLateralThrusters(ship,lateralVelocity*ship.stabilizer.strength*dt);
		else if (ship.stabilizer.clamps.enabled && Math.abs(lateralVelocity)>=ship.stabilizer.clamps.lateral && ship.thrusters.lateral.targetStrength*lateralVelocity<0)
			ship.thrusters.lateral.targetStrength = 0;
	},

	shipFireLaser:function(ship){
		var now = Date.now();
		//if the cool down is up
		if(now>ship.laser.lastFireTime+ship.laser.cd*1000){
			ship.laser.lastFireTime = now;
			ship.laser.currentPower = ship.laser.maxPower;	
			/*if(this.sounds.laser.loaded)
			{
				var laserSound = createjs.Sound.play(this.sounds.laser.id,{interrupt: createjs.Sound.INTERRUPT_ANY});
				laserSound.volume = .5 * (1-(1-this.camera.zoom)/this.soundLevel);	
			}*/
		}
	},

	shipFireCannon: function(ship){
		var now = Date.now();
		if(now>ship.cannon.lastFireTime+ship.cannon.cd*1000){
			ship.cannon.lastFireTime = now;
			ship.cannon.firing = true;
			/*var shot = 'gunshot'+getRandomIntInclusive(1,4);
			if(this.sounds[shot].loaded)
			{
				var gunshotSound = createjs.Sound.play(this.sounds[shot].id,{interrupt: createjs.Sound.INTERRUPT_LATE});
				gunshotSound.volume = .5 * (1-(1-this.camera.zoom)/this.soundLevel);	
			}*/
		}
	},

	shipAI:function(ship, target,dt){
		var vectorToTarget = [target.x-ship.x,target.y-ship.y];
		var forwardVector = utilities.getForwardVector(ship);
		var relativeAngleToTarget = angleBetweenVectors(forwardVector[0],forwardVector[1],vectorToTarget[0],vectorToTarget[1]);

		if(relativeAngleToTarget>0)
			objControls.shipRotationalThrusters(ship,-relativeAngleToTarget * dt * ship.ai.accuracy * ship.thrusters.rotational.maxStrength/ship.stabilizer.thrustRatio);
		else if (relativeAngleToTarget<0)
			objControls.shipRotationalThrusters(ship,-relativeAngleToTarget * dt * ship.ai.accuracy * ship.thrusters.rotational.maxStrength/ship.stabilizer.thrustRatio);

		var distanceSqr = vectorMagnitudeSqr(vectorToTarget[0],vectorToTarget[1]);

		var myRange = (ship.hasOwnProperty("laser")) ? ship.laser.range : 10000;

		if(relativeAngleToTarget<ship.ai.fireSpread/2 && relativeAngleToTarget>-ship.ai.fireSpread/2)
		{
			if(distanceSqr<(myRange*myRange) && ship.hasOwnProperty("laser"))
				objControls.shipFireLaser(ship);
			else if(ship.hasOwnProperty("cannon"))
				objControls.shipFireCannon(ship);
		}

		if(distanceSqr > ship.ai.followMax*ship.ai.followMax)
			objControls.shipMedialThrusters(ship,ship.thrusters.medial.maxStrength/ship.stabilizer.thrustRatio);
		else if(distanceSqr<ship.ai.followMin*ship.ai.followMin)
			objControls.shipMedialThrusters(ship,-ship.thrusters.medial.maxStrength/ship.stabilizer.thrustRatio);

		var vectorFromTarget = [-vectorToTarget[0],-vectorToTarget[1]];
		var relativeAngleToMe = angleBetweenVectors(target.forwardVectorX,target.forwardVectorY,vectorFromTarget[0],vectorFromTarget[1]);
		//console.log(Math.floor(relativeAngleToMe));

		var targetRange = (target.hasOwnProperty("laser")) ? target.laser.range : 10000;

		if(distanceSqr<2*(targetRange*targetRange) && relativeAngleToMe<90 && relativeAngleToMe>0)
			objControls.shipLateralThrusters(ship, ship.thrusters.lateral.maxStrength/ship.stabilizer.thrustRatio);
		else if(distanceSqr<2*(targetRange*targetRange) && relativeAngleToMe>-90 &&relativeAngleToMe<0)
			objControls.shipLateralThrusters(ship, -ship.thrusters.lateral.maxStrength/ship.stabilizer.thrustRatio);

		objControls.shipMedialStabilizers(ship,dt);
		objControls.shipLateralStabilizers(ship,dt);
		objControls.shipRotationalStabilizers(ship,dt);
	},

	shipKeyboardControl:function(ship, dt){
		//set ship thruster values
			//medial motion
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_W])
					objControls.shipMedialThrusters(ship,ship.thrusters.medial.maxStrength/ship.stabilizer.thrustRatio);
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_S])
					objControls.shipMedialThrusters(ship,-ship.thrusters.medial.maxStrength/ship.stabilizer.thrustRatio);
				if(ship.stabilizer.enabled)
					objControls.shipMedialStabilizers(ship,dt);
			//lateral motion
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_A])
					objControls.shipLateralThrusters(ship,ship.thrusters.lateral.maxStrength/ship.stabilizer.thrustRatio);
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_D])
					objControls.shipLateralThrusters(ship,-ship.thrusters.lateral.maxStrength/ship.stabilizer.thrustRatio);
				if(ship.stabilizer.enabled)
					objControls.shipLateralStabilizers(ship,dt);
			//rotational motion - mouse			
				objControls.shipRotationalThrusters(ship,-myMouse.direction*myMouse.sensitivity*ship.thrusters.rotational.maxStrength/ship.stabilizer.thrustRatio);
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_LEFT])
					objControls.shipRotationalThrusters(ship,ship.thrusters.rotational.maxStrength/ship.stabilizer.thrustRatio);
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_RIGHT])
					objControls.shipRotationalThrusters(ship,-ship.thrusters.rotational.maxStrength/ship.stabilizer.thrustRatio);
				if(ship.stabilizer.enabled)
					objControls.shipRotationalStabilizers(ship,dt);
			//lasers
				if(myMouse.mousedown[myMouse.BUTTONS.LEFT] || myKeys.keydown[myKeys.KEYBOARD.KEY_SPACE])
				{
					if(ship.weaponToggle && ship.hasOwnProperty("laser"))
						objControls.shipFireLaser(ship);
					else if(ship.hasOwnProperty("cannon"))
						objControls.shipFireCannon(ship);
				}
			//power system
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_SHIFT])
					ship.powerSystem.target[enums.SHIP_COMPONENTS.THRUSTERS] = 1;
				if(myMouse.mousedown[myMouse.BUTTONS.RIGHT])
					ship.powerSystem.target[enums.SHIP_COMPONENTS.LASERS] = 1;
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_ALT])
					ship.powerSystem.target[enums.SHIP_COMPONENTS.SHIELDS] = 1;
	}
};