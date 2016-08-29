"use strict"

var ships = {
	cheetah:{
		model:{
			vertices:[
				[-20,17],
				[0,7],
				[20,17],
				[0,-23]
			],

			shieldVectors:[
				[-.761939, 0.647648],
				[0,.5],
				[.761939, 0.647648],
				[0,-1]
			],

			thrusterPoints:{
				medial:{
					positive:[[-12.5,12],[12.5,12]],
					negative:[[-12.5,7],[12.5,7]]
				},
				lateral:{
					positive:[[10,1.5]],
					negative:[[-10,1.5]]
				},
				rotational:{
					positive:[[5,-8.5]],
					negative:[[-5,-8.5]]
				},
				width:5
			},
			overlay:{
				colorCircle:{},
				destructible:{},
				ranges:{
					laser:{}
				}
			}
		},
		laser:{},
		stabilizer:{},
		powerSystem:{}
	},

	gull:{
		model:{
			vertices:[
				[-10,-5],
				[0,20],
				[10,-5],
				[0,-20]
			],

			shieldVectors:[
				[-.5, 0],
				[0,1.25],
				[.5, 0],
				[0,-.75]
			],

			thrusterPoints:{
				medial:{
					positive:[[0,7]],
					negative:[[0,2]]
				},
				lateral:{
					positive:[[10,-5]],
					negative:[[-10,-5]]
				},
				rotational:{
					positive:[[2,-10]],
					negative:[[-2,-10]]
				},
				width:5
			},

			overlay:{
				colorCircle:{},
				destructible:{},
				targetingSystem:{}
			}
		},
		cannon:{},
		stabilizer:{},
		powerSystem:{},
		launcher:{},
		targetingSystem:{}
	}
};

var missiles = {
	tomcat:{
		cullTolerance:.3,
		model:{
			vertices:[
				[-10, 15],
				[0,-15],
				[10,15]
			],
			thrusterPoints:{
				medial:{
					positive:[[0,15]],
					negative:[[-12.5,7]]
				},
				lateral:{
					positive:[[10,1.5]],
					negative:[[-10,1.5]]
				},
				rotational:{
					positive:[[5,-8.5]],
					negative:[[-5,-8.5]]
				},
				width:5
			},
			overlay:{
				
			}
		},
		destructible:{
			hp:15,
			radius:15,
			shield:{
				max:0
			}
		},
		warhead:{},
		ai:{
			aiFunction:'basicMissile',
			detonationRadius:100
		}
	}
};

var aiFunctions = {
	basic:function(obj, dt){
		//return;
		var target;
		var lowestDistance = Number.MAX_VALUE;
		var cVal;
		for(var c = -1; c< obj.game.otherShips.length;c++){
			var ship = (c==-1)?obj.game.ship:obj.game.otherShips[c];
			if((obj.faction == ship.faction && obj.faction!=-1) || obj == ship)
			{
				//console.log('continue');
				continue;
			}
			var distanceSqr = obj.x*ship.x+obj.y*ship.y;
			if(distanceSqr<lowestDistance)
			{
				target = ship;
				lowestDistance = distanceSqr;
				cVal = c;
			}
		}

		if(!target)
			return;
		//console.log(cVal+' '+obj.faction);
		var vectorToTarget = [target.x-obj.x,target.y-obj.y];
		var forwardVector = utilities.getForwardVector(obj);
		var relativeAngleToTarget = angleBetweenVectors(forwardVector[0],forwardVector[1],vectorToTarget[0],vectorToTarget[1]);

		if(relativeAngleToTarget>0)
			objControls.objRotationalThrusters(obj,-relativeAngleToTarget * dt * obj.ai.accuracy * obj.thrusterSystem.rotational.maxStrength/obj.stabilizer.thrustRatio);
		else if (relativeAngleToTarget<0)
			objControls.objRotationalThrusters(obj,-relativeAngleToTarget * dt * obj.ai.accuracy * obj.thrusterSystem.rotational.maxStrength/obj.stabilizer.thrustRatio);

		var distanceSqr = vectorMagnitudeSqr(vectorToTarget[0],vectorToTarget[1]);

		var myRange = (obj.hasOwnProperty("laser")) ? obj.laser.range : 10000;

		if(relativeAngleToTarget<obj.ai.fireSpread/2 && relativeAngleToTarget>-obj.ai.fireSpread/2)
		{
			if(distanceSqr<(myRange*myRange) && obj.hasOwnProperty("laser"))
				objControls.objFireLaser(obj);
			else if(obj.hasOwnProperty("cannon"))
				objControls.objFireCannon(obj);
		}

		if(distanceSqr > obj.ai.followMax*obj.ai.followMax)
			objControls.objMedialThrusters(obj,obj.thrusterSystem.medial.maxStrength/obj.stabilizer.thrustRatio);
		else if(distanceSqr<obj.ai.followMin*obj.ai.followMin)
			objControls.objMedialThrusters(obj,-obj.thrusterSystem.medial.maxStrength/obj.stabilizer.thrustRatio);

		var vectorFromTarget = [-vectorToTarget[0],-vectorToTarget[1]];
		var relativeAngleToMe = angleBetweenVectors(target.forwardVectorX,target.forwardVectorY,vectorFromTarget[0],vectorFromTarget[1]);
		//console.log(Math.floor(relativeAngleToMe));

		var targetRange = (target.hasOwnProperty("laser")) ? target.laser.range : 10000;

		if(distanceSqr<2*(targetRange*targetRange) && relativeAngleToMe<90 && relativeAngleToMe>0)
			objControls.objLateralThrusters(obj, obj.thrusterSystem.lateral.maxStrength/obj.stabilizer.thrustRatio);
		else if(distanceSqr<2*(targetRange*targetRange) && relativeAngleToMe>-90 &&relativeAngleToMe<0)
			objControls.objLateralThrusters(obj, -obj.thrusterSystem.lateral.maxStrength/obj.stabilizer.thrustRatio);

		objControls.objMedialStabilizers(obj,dt);
		objControls.objLateralStabilizers(obj,dt);
		objControls.objRotationalStabilizers(obj,dt);
	},
	basicMissile:function(obj, dt){
		var target = (obj.ai.specialProperties) ? obj.ai.specialProperties.target : undefined;
		if(target)
		{
			var vectorToTarget = (target.velocityX && target.velocityY) ? [target.x-obj.x+target.velocityX*.5,target.y-obj.y+target.velocityY*.5] : [target.x-obj.x,target.y-obj.y];
			if(vectorToTarget[0]*vectorToTarget[0] + vectorToTarget[1]*vectorToTarget[1] < (obj.ai.detonationRadius + target.destructible.radius + obj.destructible.radius) * (obj.ai.detonationRadius + target.destructible.radius + obj.destructible.radius))
			{
				obj.destructible.hp = 0;
				console.log('detonation');
			}
			var rightVector = utilities.getRightVector(obj);
			var forwardVector = utilities.getForwardVector(obj);
			var relativeAngleToTarget = angleBetweenVectors(forwardVector[0],forwardVector[1],vectorToTarget[0],vectorToTarget[1]);
			var lateralDisplacementToTarget = scalarComponentOf1InDirectionOf2(vectorToTarget[0], vectorToTarget[1], rightVector[0], rightVector[1]);
			var timeTillAligned = relativeAngleToTarget/obj.rotationalVelocity;
			var timeTillStop = Math.abs(obj.rotationalVelocity/obj.thrusterSystem.rotational.maxStrength);

			if(obj.rotationalVelocity==0)
			{
				objControls.objRotationalThrusters(obj, -relativeAngleToTarget * obj.thrusterSystem.rotational.maxStrength);
				return;
			}

			if(timeTillAligned<0 || timeTillAligned<timeTillStop)
				objControls.objRotationalThrusters(obj, (obj.rotationalVelocity/Math.abs(obj.rotationalVelocity))*obj.thrusterSystem.rotational.maxStrength*timeTillStop*10);
			else if(timeTillAligned>timeTillStop)
				objControls.objRotationalThrusters(obj, -(obj.rotationalVelocity/Math.abs(obj.rotationalVelocity))*obj.thrusterSystem.rotational.maxStrength*timeTillStop*10);

			objControls.objLateralThrusters(obj,utilities.getLateralVelocity(obj)*1200*dt);
			objControls.objMedialThrusters(obj, obj.thrusterSystem.medial.maxStrength);

			//objControls.objLateralStabilizers(obj, dt);
		}
		else objControls.objMedialThrusters(obj, obj.thrusterSystem.medial.maxStrength);
	}
};