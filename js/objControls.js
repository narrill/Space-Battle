"use strict"

var objControls = {
	//add given strength to main thruster
	objMedialThrusters:function(obj, strength){
		obj.thrusters.medial.targetStrength += strength;
	},

	//add strength to side thruster
	objRotationalThrusters: function(obj, strength){
		obj.thrusters.rotational.targetStrength += strength;
	},

	//add strength to lateral thruster
	objLateralThrusters:function(obj, strength){
		obj.thrusters.lateral.targetStrength += strength;
	},

	//rotational stabilizer
	objRotationalStabilizers:function(obj,dt){
		if(!obj.stabilizer)
			return;
		//if the side thruster isn't active, or is active in the opposite direction of our rotation
		if(obj.thrusters.rotational.targetStrength*obj.rotationalVelocity>=0 && Math.abs(obj.rotationalVelocity) > obj.stabilizer.precision/6)
			//add correctional strength in the opposite direction of our rotation
			objControls.objRotationalThrusters(obj,obj.rotationalVelocity*obj.stabilizer.strength*dt); //we check the direction because the stabilizers can apply more thrust than the player
		//or, if we've exceeded our clamp speed and are trying to keep accelerating in that direction
		else if (obj.stabilizer.clamps.enabled && Math.abs(obj.rotationalVelocity)>=obj.stabilizer.clamps.rotational && obj.thrusters.rotational.targetStrength*obj.rotationalVelocity<0)
			//shut off the thruster
			obj.thrusters.rotational.targetStrength = 0;
	},

	//medial stabilizer
	objMedialStabilizers:function(obj,dt){
		if(!obj.stabilizer)
			return;
		//if the main thruster isn't active, or is working against our velocity
		var medialVelocity = utilities.getMedialVelocity(obj);
		if(obj.thrusters.medial.targetStrength*medialVelocity>=0 && Math.abs(medialVelocity) > obj.stabilizer.precision)
			//add corrective strength
			objControls.objMedialThrusters(obj,medialVelocity*obj.stabilizer.strength*dt);
		//or, if we're past our clamp and trying to keep going
		else if (obj.stabilizer.clamps.enabled && Math.abs(medialVelocity)>=obj.stabilizer.clamps.medial && obj.thrusters.medial.targetStrength*medialVelocity<0)
			//shut off the thruster
			obj.thrusters.medial.targetStrength = 0;
	},

	//lateral stabilizer
	objLateralStabilizers:function(obj,dt){
		if(!obj.stabilizer)
			return;
		//see above
		var lateralVelocity = utilities.getLateralVelocity(obj);
		if(obj.thrusters.lateral.targetStrength*lateralVelocity>=0 && Math.abs(lateralVelocity) > obj.stabilizer.precision)
			objControls.objLateralThrusters(obj,lateralVelocity*obj.stabilizer.strength*dt);
		else if (obj.stabilizer.clamps.enabled && Math.abs(lateralVelocity)>=obj.stabilizer.clamps.lateral && obj.thrusters.lateral.targetStrength*lateralVelocity<0)
			obj.thrusters.lateral.targetStrength = 0;
	},

	objFireLaser:function(obj){
		if(!obj.laser)
			return;
		var now = Date.now();
		//if the cool down is up
		if(now>obj.laser.lastFireTime+obj.laser.cd*1000){
			obj.laser.lastFireTime = now;
			obj.laser.currentPower = obj.laser.maxPower;	
			/*if(this.sounds.laser.loaded)
			{
				var laserSound = createjs.Sound.play(this.sounds.laser.id,{interrupt: createjs.Sound.INTERRUPT_ANY});
				laserSound.volume = .5 * (1-(1-this.camera.zoom)/this.soundLevel);	
			}*/
		}
	},

	objFireCannon: function(obj){
		if(!obj.cannon)
			return;
		var now = Date.now();
		if(now>obj.cannon.lastFireTime+obj.cannon.cd*1000){
			obj.cannon.lastFireTime = now;
			obj.cannon.firing = true;
			/*var shot = 'gunshot'+getRandomIntInclusive(1,4);
			if(this.sounds[shot].loaded)
			{
				var gunshotSound = createjs.Sound.play(this.sounds[shot].id,{interrupt: createjs.Sound.INTERRUPT_LATE});
				gunshotSound.volume = .5 * (1-(1-this.camera.zoom)/this.soundLevel);	
			}*/
		}
	},

	objFireLauncher: function(obj){
		if(!obj.launcher)
			return;
		var now = Date.now();
		if(now>obj.launcher.lastFireTime+obj.launcher.cd*1000){
			obj.launcher.lastFireTime = now;
			obj.launcher.firing = true;
		}
	},

	objKeyboardControl:function(obj, dt){
		//set obj thruster values
			//medial motion
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_W])
					objControls.objMedialThrusters(obj,obj.thrusters.medial.maxStrength/obj.stabilizer.thrustRatio);
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_S])
					objControls.objMedialThrusters(obj,-obj.thrusters.medial.maxStrength/obj.stabilizer.thrustRatio);
				if(obj.stabilizer.enabled)
					objControls.objMedialStabilizers(obj,dt);
			//lateral motion
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_A])
					objControls.objLateralThrusters(obj,obj.thrusters.lateral.maxStrength/obj.stabilizer.thrustRatio);
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_D])
					objControls.objLateralThrusters(obj,-obj.thrusters.lateral.maxStrength/obj.stabilizer.thrustRatio);
				if(obj.stabilizer.enabled)
					objControls.objLateralStabilizers(obj,dt);
			//rotational motion - mouse			
				objControls.objRotationalThrusters(obj,-myMouse.direction*myMouse.sensitivity*obj.thrusters.rotational.maxStrength/obj.stabilizer.thrustRatio);
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_LEFT])
					objControls.objRotationalThrusters(obj,obj.thrusters.rotational.maxStrength/obj.stabilizer.thrustRatio);
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_RIGHT])
					objControls.objRotationalThrusters(obj,-obj.thrusters.rotational.maxStrength/obj.stabilizer.thrustRatio);
				if(obj.stabilizer.enabled)
					objControls.objRotationalStabilizers(obj,dt);
			//weapons
				if(myMouse.mousedown[myMouse.BUTTONS.LEFT] || myKeys.keydown[myKeys.KEYBOARD.KEY_SPACE])
				{
					if(obj.weaponToggle && obj.hasOwnProperty("laser"))
						objControls.objFireLaser(obj);
					else if(obj.hasOwnProperty("cannon"))
						objControls.objFireCannon(obj);
				}
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_Q])
					objControls.objFireLauncher(obj);
			//power system
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_SHIFT])
					obj.powerSystem.target[enums.SHIP_COMPONENTS.THRUSTERS] = 1;
				if(myMouse.mousedown[myMouse.BUTTONS.RIGHT])
					obj.powerSystem.target[enums.SHIP_COMPONENTS.LASERS] = 1;
				if(myKeys.keydown[myKeys.KEYBOARD.KEY_ALT])
					obj.powerSystem.target[enums.SHIP_COMPONENTS.SHIELDS] = 1;
	}
};