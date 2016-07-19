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
		laser:{}
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
		cannon:{}
	}
};