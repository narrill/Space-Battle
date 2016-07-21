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
			}
		},
		laser:{},
		stabilizer:{},
		powerSystem:{},
		launcher:{}
	},

	gull:{
		model:{
			vertices:[
				[-10,0],
				[0,20],
				[10,0],
				[0,-20]
			],

			shieldVectors:[
				[-.5, 0],
				[0,1],
				[.5, 0],
				[0,-1]
			],

			thrusterPoints:{
				medial:{
					positive:[[0,12]],
					negative:[[0,7]]
				},
				lateral:{
					positive:[[10,0]],
					negative:[[-10,0]]
				},
				rotational:{
					positive:[[2,-5]],
					negative:[[-2,-5]]
				},
				width:5
			}
		},
		cannon:{},
		stabilizer:{},
		powerSystem:{},
		launcher:{}
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
			radius:5,
			shield:{
				max:0
			}
		},
		warhead:{},
		ai:{
			aiFunction:'tomcat'
		}
	}
};

var aiFunctions = {
	basic:function(obj, dt){
		var target = obj.game.ship;
		var vectorToTarget = [target.x-obj.x,target.y-obj.y];
		var forwardVector = utilities.getForwardVector(obj);
		var relativeAngleToTarget = angleBetweenVectors(forwardVector[0],forwardVector[1],vectorToTarget[0],vectorToTarget[1]);

		if(relativeAngleToTarget>0)
			objControls.objRotationalThrusters(obj,-relativeAngleToTarget * dt * obj.ai.accuracy * obj.thrusters.rotational.maxStrength/obj.stabilizer.thrustRatio);
		else if (relativeAngleToTarget<0)
			objControls.objRotationalThrusters(obj,-relativeAngleToTarget * dt * obj.ai.accuracy * obj.thrusters.rotational.maxStrength/obj.stabilizer.thrustRatio);

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
			objControls.objMedialThrusters(obj,obj.thrusters.medial.maxStrength/obj.stabilizer.thrustRatio);
		else if(distanceSqr<obj.ai.followMin*obj.ai.followMin)
			objControls.objMedialThrusters(obj,-obj.thrusters.medial.maxStrength/obj.stabilizer.thrustRatio);

		var vectorFromTarget = [-vectorToTarget[0],-vectorToTarget[1]];
		var relativeAngleToMe = angleBetweenVectors(target.forwardVectorX,target.forwardVectorY,vectorFromTarget[0],vectorFromTarget[1]);
		//console.log(Math.floor(relativeAngleToMe));

		var targetRange = (target.hasOwnProperty("laser")) ? target.laser.range : 10000;

		if(distanceSqr<2*(targetRange*targetRange) && relativeAngleToMe<90 && relativeAngleToMe>0)
			objControls.objLateralThrusters(obj, obj.thrusters.lateral.maxStrength/obj.stabilizer.thrustRatio);
		else if(distanceSqr<2*(targetRange*targetRange) && relativeAngleToMe>-90 &&relativeAngleToMe<0)
			objControls.objLateralThrusters(obj, -obj.thrusters.lateral.maxStrength/obj.stabilizer.thrustRatio);

		objControls.objMedialStabilizers(obj,dt);
		objControls.objLateralStabilizers(obj,dt);
		objControls.objRotationalStabilizers(obj,dt);
	},
	tomcat:function(obj, dt){
		objControls.objMedialThrusters(obj, obj.thrusters.medial.maxStrength);
	}
};