"use strict"

var enums = {
	SHIP_COMPONENTS:{
		THRUSTERS:0,
		LASERS:1,
		SHIELDS:2,
		CANNON:3
	}
};

var gameFunctions = {
	//initialize the stuff
	init : function(game) {
		// initialize properties			
			//constructors.generateStarField.bind(game, game.stars)();
			constructors.makeAsteroids.bind(game,game,game.grid)();
			//game.ship = constructors.createShip(ships.cheetah, game);
			game.reportQueue = new SuperArray();
			game.tileArray = new SuperArray();
			game.tileArray.min = [Number.MAX_VALUE, Number.MAX_VALUE];
			game.tileArray.max = [-Number.MAX_VALUE, -Number.MAX_VALUE];
			game.tileArray.map = {position:[0,0],size:[0,0],precision:0};
			var hue = Math.round(Math.random()*360);
			for(var c = 0;c<game.factions;c++){
				game.factionColors[c] = 'hsl('+hue+',100%,65%)';
				hue+=360/game.factions;
				if(hue>=360)
					hue-=360;
			}
			for(var c = 0;c<game.maxOtherShips;c++)
			{
				//var newShip = deepObjectMerge({},(Math.round(Math.random())) ? ships.gull : ships.cheetah);
				var newShip = deepObjectMerge({}, (Math.random()>=.5)?ships.gull:ships.cheetah);
				newShip.ai = {
					aiFunction:'basic',
					followMin:2500,
					followMax:3000,
					accuracy:.5,
					fireSpread:5
				};
				newShip.faction = Math.floor(Math.random()*game.factions);
				newShip.respawnTime = 5;
				game.otherShips.push(constructors.createShip(newShip, game));
			}
		// start the game loop		
			game.lastTime = Date.now();
			game.elapsedGameTime = 0;
			//game.animationID = requestAnimationFrame(game.frame.bind(game));
			gameFunctions.loop.bind(game)();
			return game;
	},

	//the main this function - called once per frame
	loop:function(){
		//this.animationID = requestAnimationFrame(gameFunctions.frame.bind(this));
		this.frameTimeout = setTimeout(gameFunctions.loop.bind(this),this.timeStep*500);
		var dt = utilities.calculateDeltaTime(this);
		if(dt>this.timeStep*4)
		{
			console.log('server throttle');
			dt = this.timeStep;
		}
		this.accumulator+=dt;
		while(this.accumulator>=this.timeStep){
			gameFunctions.update(this,this.timeStep);
			this.accumulator-= this.timeStep;
		}
		//gameFunctions.draw(this, dt);
	},

	//one game tick
	update: function(game, dt){
	 	//clear values
		clearFunctions.clearHitscans(game.hitscans);
		clearFunctions.clearDestructibles(game.asteroids.objs);
		clearFunctions.clearDestructibles(game.otherShips); 
		clearFunctions.clearDestructibles(game.updatables);
		clearFunctions.clearDestructibles(game.projectiles);
		clearFunctions.cullDestructibles(game.projectiles, game.grid);
		clearFunctions.cullDestructibles(game.otherShips, game.grid);
		clearFunctions.clearRadials(game.radials);

	 	/*if(game.otherShipCount<game.maxOtherShips)
	 	{
			game.otherShipCount+=game.otherShipCount-game.otherShips.length;
			for(;game.otherShips.length<game.otherShipCount;){ //lol
				var newShip = deepObjectMerge({},(Math.round(Math.random())) ? ships.gull : ships.cheetah);
				newShip.ai = {
					aiFunction:'basic',
					followMin:2500,
					followMax:3000,
					accuracy:.5,
					fireSpread:5
				};
				game.otherShips.push(constructors.createShip(newShip, game));
				//game.otherShips[game.otherShips.length-1].ai = constructors.createComponentShipAI();
			}
	 	}*/
		/*game.otherShips.forEach(function(ship){
			//objControls.objAI(ship,game.ship,dt);
		},game);*/

		for(var c = 0;c<game.respawnQueue.length;c++){
			var rs = game.respawnQueue[c];
			if(game.elapsedGameTime>=rs.time)
			{
				game.otherShips.push(constructors.createShip(rs.params, game));
				game.respawnQueue.splice(c--,1);
			}
		}
		for(var c = 0;c<game.asteroids.objs.length;c++)
			updaters.queueReport(game.asteroids.objs[c]);

	 	//update ship, center main camera on ship
		//game.updateShip(game.ship,dt);
		for(var i = 0; i<game.projectiles.length; i++){
			updaters.updateMobile(game.projectiles[i], dt);
			updaters.queueReport(game.projectiles[i]);
		}
		for(var i = 0;i<game.radials.length; i++){
			updaters.updateRadial(game.radials[i], dt);
			updaters.queueReport(game.radials[i]);
		}
		//updaters.updateUpdatable(game.ship,dt);
		game.otherShips.forEach(function(ship){
			updaters.updateUpdatable(ship,dt);
		},game);	


		for(var i = 0;i<game.hitscans.length;i++)
		{
			updaters.queueReport(game.hitscans[i]);
		}

		gameFunctions.processReportQueue(game, dt);		

		gameFunctions.checkCollisions(game, dt);

		for(var c = 0;c<game.functionQueue.length;c++)
		{
			game.functionQueue[c]();
			game.functionQueue.splice(c--,1);
		}

		game.elapsedGameTime+=dt*1000;	

	 	

		//game needs to be done
		//resetDirection();

		//if(game.thrusterSound && (game.gameState == enums.GAME_STATES.PLAYING || game.gameState == enums.GAME_STATES.TUTORIAL))
		//	game.thrusterSound.volume = (game.paused)?0:game.ship.thrusterSystem.noiseLevel*2*(1-(1-game.camera.zoom)/game.soundLevel);

		//because we might use the frame count for something at some point
		game.frameCount++;
	},

	checkCollisions:function(game, dt){
		//obj collisions
			//var resolvedCollisions = [];
			for(var i = 0;i<game.otherShips.length;i++){
				var currentObj = ((i==-1)?game.ship:game.otherShips[i]);
				var currentObjNext = [currentObj.x+currentObj.velocityX*dt, currentObj.y+currentObj.velocityY*dt];
				var currentObjCapsule = {center1:[currentObj.x,currentObj.y], center2:currentObjNext, radius:currentObj.destructible.radius};
				for(var c = i+1;c<game.otherShips.length;c++){
					var gameObj = ((c==-1) ? game.ship : game.otherShips[c]); //lol
					/*if(currentObj.faction == -1 || gameObj.faction== -1 || currentObj.faction == gameObj.faction)
						continue;*/
					if(currentObj.specialProperties && gameObj == currentObj.specialProperties.owner || gameObj.specialProperties && currentObj == gameObj.specialProperties.owner)
						continue;
					var gameObjNext = [gameObj.x+gameObj.velocityX*dt, gameObj.y+gameObj.velocityY*dt];
					var distanceSqr = Math.abs((currentObj.x - gameObj.x)*(currentObj.x - gameObj.x) + (currentObj.y - gameObj.y)*(currentObj.y - gameObj.y));
					if(distanceSqr>5*(currentObj.destructible.radius+gameObj.destructible.radius)*(currentObj.destructible.radius+gameObj.destructible.radius))
						continue;
					//if(capsuleCapsuleSAT({center1:[gameObj.x,gameObj.y], center2:[gameObj.x+gameObj.velocityX*dt, gameObj.y+gameObj.velocityY*dt], radius:gameObj.destructible.radius}, currentObjCapsule))
					if(capsuleCapsuleSAT({center1:[gameObj.x,gameObj.y], center2:gameObjNext, radius:gameObj.destructible.radius}, currentObjCapsule))
					{
						//console.log('collision');
						collisions.basicKineticCollision(currentObj, gameObj, dt);
						//console.log(damage+' damage, '+magnitude+' magnitude');
					}
				}
				var projectiles = gameFunctions.fetchFromTileArray(game, [currentObj.x,currentObj.y],currentObj.destructible.radius,{prj:[]});
				var prj, prjNext = [], prjCapsule;
				for(var c = 0;c<projectiles.prj.length;c++)
				{
					prj = projectiles.prj[c];
					prjNext[0]=prj.x+prj.velocityX*dt, prjNext[1] = prj.y+prj.velocityY*dt;
					prjCapsule = {center1:[prj.x,prj.y], center2:prjNext, radius:prj.destructible.radius};
					if(currentObj == prj.owner)
							continue;
					if(capsuleCapsuleSAT({center1:[currentObj.x,currentObj.y], center2:currentObjNext, radius:currentObj.destructible.radius}, prjCapsule))
					{
						prj.collisionFunction(prj, currentObj, dt);
					}
				}
			}
		//hitscan collisions
			game.hitscans.forEach(function(hitscan){
				if(hitscan.power == 0)
					return;
				//hitscan.nextHitscan = constructors.createNextHitscanObject(hitscan, dt);
				var obj; //the chosen object
				var tValOfObj = Number.MAX_VALUE;
				var xInv = hitscan.endX<hitscan.startX;
				var yInv = hitscan.endY<hitscan.startY;
				var start = [(xInv) ? hitscan.endX : hitscan.startX, (yInv) ? hitscan.endY : hitscan.startY];
				var end = [(xInv) ? hitscan.startX : hitscan.endX, (yInv) ? hitscan.startY : hitscan.endY];
				var hitscanVertices = [
					[hitscan.startX, hitscan.startY],
					[hitscan.endX, hitscan.endY],
					[hitscan.endX+hitscan.velocityX*dt,hitscan.endY+hitscan.velocityY*dt],
					[hitscan.startX+hitscan.velocityX*dt,hitscan.startY+hitscan.velocityY*dt]
				];
				//hitscan-asteroid
					for(var c = 0;c<game.asteroids.objs.length;c++){
						var gameObj = game.asteroids.objs[c];
						if(gameObj.x + gameObj.destructible.radius<start[0] || gameObj.x-gameObj.destructible.radius>end[0] || gameObj.y + gameObj.destructible.radius<start[1] || gameObj.y-gameObj.destructible.radius>end[1])
							continue;
						var gameDistance = distanceFromPointToLine(gameObj.x,gameObj.y,hitscan.startX,hitscan.startY,hitscan.endX,hitscan.endY);
						if(gameDistance[0]<gameObj.destructible.radius && gameDistance[1]<tValOfObj){
							obj = gameObj;
							tValOfObj = gameDistance[1];
						}
					}
				//hitscan-ship
					for(var c = 0;c<game.otherShips.length;c++){
						var gameObj = ((c==-1) ? game.ship : game.otherShips[c]); //lol
						if(gameObj == hitscan.owner)
							continue;
						/*if(hitscan.owner.faction == -1 || gameObj.faction == -1 || hitscan.owner.faction == gameObj.faction)
							continue;*/
						if(gameObj.x + gameObj.destructible.radius<start[0] || gameObj.x-gameObj.destructible.radius>end[0] || gameObj.y + gameObj.destructible.radius<start[1] || gameObj.y-gameObj.destructible.radius>end[1])
							continue;
						var gameDistance = distanceFromPointToLine(gameObj.x,gameObj.y,hitscan.startX,hitscan.startY,hitscan.endX,hitscan.endY);

						if(gameDistance[1]<tValOfObj && polygonCapsuleSAT(hitscanVertices, {center1:[gameObj.x, gameObj.y], center2:[gameObj.x+gameObj.velocityX*dt, gameObj.y+gameObj.velocityY*dt], radius:gameObj.destructible.radius})){
							obj = gameObj;
							tValOfObj = gameDistance[1];
						}
					}
				//hitscan-projectile
					for(var c = 0;c<game.projectiles.length;c++){
						var gameObj = game.projectiles[c];
						var gameObjNext = [gameObj.x+gameObj.velocityX*dt, gameObj.y+gameObj.velocityY*dt];
						if(gameObj == hitscan.owner)
							continue;
						if(gameObj.x + gameObj.destructible.radius<start[0] || gameObj.x-gameObj.destructible.radius>end[0] || gameObj.y + gameObj.destructible.radius<start[1] || gameObj.y-gameObj.destructible.radius>end[1])
							continue;
						var gameDistance = distanceFromPointToLine(gameObj.x,gameObj.y,hitscan.startX,hitscan.startY,hitscan.endX,hitscan.endY);

						if(gameDistance[1]<tValOfObj && polygonCapsuleSAT(hitscanVertices, {center1:[gameObj.x, gameObj.y], center2:gameObjNext, radius:gameObj.destructible.radius})){
							obj = gameObj;
							tValOfObj = gameDistance[1];
							//console.log('hitscan-projectile collision');
						}
					}

				//resolve collision
					if(obj)
					{
						hitscan.collisionFunction(hitscan, obj, tValOfObj, dt);
						var hitscanDir = [hitscan.endX-hitscan.startX,hitscan.endY-hitscan.startY];
						var newEnd = [hitscan.startX+tValOfObj*hitscanDir[0],hitscan.startY+tValOfObj*hitscanDir[1]];
						hitscan.endX = newEnd[0];
						hitscan.endY = newEnd[1];
					}
			},game);

		//projectile collisions
			/*for(var n = 0; n<game.projectiles.length; n++){
				var prj = game.projectiles[n];
				var prjNext = [prj.x+prj.velocityX*dt, prj.y+prj.velocityY*dt];
				var prjCapsule = {center1:[prj.x,prj.y], center2:prjNext, radius:prj.destructible.radius};
				//var prjCapsule = {center1:[prj.x,prj.y], center2:[prj.x+prj.prevX, prj.y+prj.prevY], radius:prj.destructible.radius};
				//projectile-ship
					for(var c = 0;c<game.otherShips.length;c++){
						var gameObj = ((c==-1) ? game.ship : game.otherShips[c]); //lol
						var gameObjNext = [gameObj.x+gameObj.velocityX*dt, gameObj.y+gameObj.velocityY*dt];
						if(gameObj == prj.owner)
							continue;
						var distanceSqr = Math.abs((prj.x - gameObj.x)*(prj.x - gameObj.x) + (prj.y - gameObj.y)*(prj.y - gameObj.y));
						if(distanceSqr>5*(prj.destructible.radius+gameObj.destructible.radius)*(prj.destructible.radius+gameObj.destructible.radius))
							continue;
						//if(capsuleCapsuleSAT({center1:[gameObj.x,gameObj.y], center2:[gameObj.x+gameObj.velocityX*dt, gameObj.y+gameObj.velocityY*dt], radius:gameObj.destructible.radius}, prjCapsule))
						if(capsuleCapsuleSAT({center1:[gameObj.x,gameObj.y], center2:gameObjNext, radius:gameObj.destructible.radius}, prjCapsule))
						{
							prj.collisionFunction(prj, gameObj, dt);
							//console.log(damage+' damage, '+magnitude+' magnitude');
						}
					}

				//projectile-asteroid
					for(var c = 0; c<game.asteroids.objs.length; c++){
						var gameObj = game.asteroids.objs[c];
						var distanceSqr = Math.abs((prj.x - gameObj.x)*(prj.x - gameObj.x) + (prj.y - gameObj.y)*(prj.y - gameObj.y));
						if(distanceSqr<=(prj.destructible.radius+gameObj.destructible.radius)*(prj.destructible.radius+gameObj.destructible.radius))
						{
							prj.collisionFunction(prj, gameObj, dt);
						}
					}
			}*/

		//asteroid collisions
			for(var c = 0;c<game.otherShips.length;c++){
				var ship = ((c==-1)? game.ship:game.otherShips[c]);
				for(var n = 0;n<game.asteroids.objs.length;n++){
					var asteroid = game.asteroids.objs[n];
					var distance = (ship.x-asteroid.x)*(ship.x-asteroid.x) + (ship.y-asteroid.y)*(ship.y-asteroid.y);
					var overlap = (ship.destructible.radius+asteroid.radius)*(ship.destructible.radius+asteroid.radius) - distance;
					if(overlap>=0)
					{
						if(game.frameCount<25)
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

		//radial collisions
			for(var n = 0;n<game.radials.length;n++)
			{
				var rad = game.radials[n];
				for(var c = 0;c<game.otherShips.length;c++)
				{
					var gameObj = ((c==-1) ? game.ship : game.otherShips[c]); //lol
					var gameObjNext = [gameObj.x+gameObj.velocityX*dt, gameObj.y+gameObj.velocityY*dt];
					var circleInner = {center:[rad.x,rad.y],radius:rad.radius};
					var circleOuter = {center:[rad.x,rad.y],radius:rad.radius+rad.velocity*dt};
					var capsule = {center1:[gameObj.x,gameObj.y],center2:gameObjNext,radius:gameObj.destructible.radius};
					if(circleCapsuleSAT(circleOuter,capsule) && !isCapsuleWithinCircle(circleInner,capsule))
						rad.collisionFunction(rad, gameObj,dt);
				}
			}
	},	

	queueFunction:function(game, f){
		game.functionQueue.push(f);
	},

	processReportQueue:function(game, dt){
		var map = {};
		map.position = [game.tileArray.min[0],game.tileArray.min[1]];
		map.size = [game.tileArray.max[0]-game.tileArray.min[0], game.tileArray.max[1]-game.tileArray.min[1]];
		map.precision = 120000;
		var taSize = mapFunctions.posTo1dIndex([map.position[0]+map.size[0],map.position[1]+map.size[1]],map);
		for(var c = 0;c<=taSize;c++)
		{
			//console.log('adding tile '+c);
			if(c>=game.tileArray.count)
				game.tileArray.push({
					asteroid: new SuperArray(),
					obj: new SuperArray(),
					prj: new SuperArray(),
					hitscan: new SuperArray(),
					radial: new SuperArray()
				});
			else{
				game.tileArray.get(c)['asteroid'].clear();
				game.tileArray.get(c)['obj'].clear();
				game.tileArray.get(c)['prj'].clear();
				game.tileArray.get(c)['hitscan'].clear();
				game.tileArray.get(c)['radial'].clear();
			}
		}
		var info = {};
		var item, currentIndex, tiles = [], velY, velX, min = [], max = [], rqArray = game.reportQueue.array, mmfo = gameFunctions.getMinMaxFromObject, taa = game.tileArray.array, p21d = mapFunctions.posTo1dIndex;
		console.log(game.reportQueue.count+', '+taSize);
		for(var c = 0, counter = game.reportQueue.count;c<counter;c++){
			item = rqArray[c];//game.reportQueue.get(c);
			mmfo(item,min,max);
			tiles = [];
			if(item.x && item.y)
			{
				currentIndex = p21d([(item.x) ? item.x : item.startX,(item.y) ? item.y : item.startY],map);
				tiles[0] = currentIndex;
				taa[currentIndex][item.type].push(item);
			}
			currentIndex = p21d([min[0],min[1]],map);
			if(currentIndex<=taSize && currentIndex>=0 && !tiles.includes(currentIndex))
			{
				tiles[1] = currentIndex;
				taa[currentIndex][item.type].push(item);
			}
			currentIndex = p21d([min[0],max[1]],map);
			if(currentIndex<=taSize && currentIndex>=0 && !tiles.includes(currentIndex))
			{
				tiles[2] = currentIndex;
				taa[currentIndex][item.type].push(item);
			}
			currentIndex = p21d([max[0],min[1]],map);
			if(currentIndex<=taSize && currentIndex>=0 && !tiles.includes(currentIndex))
			{
				tiles[3] = currentIndex;
				taa[currentIndex][item.type].push(item);
			}
			currentIndex = p21d([max[0],max[1]],map);
			if(currentIndex<=taSize && currentIndex>=0 && !tiles.includes(currentIndex))
			{
				tiles[4] = currentIndex;
				taa[currentIndex][item.type].push(item);
			}
		}
		game.tileArray.map = map;
		game.reportQueue.clear();
		game.tileArray.min = [Number.MAX_VALUE, Number.MAX_VALUE];
		game.tileArray.max = [-Number.MAX_VALUE, -Number.MAX_VALUE];
	},

	fetchFromTileArray:function(game, pos, radius, objectList){
		var min = [pos[0]-radius, pos[1]-radius];
		var max = [pos[0]+radius, pos[1]+radius];
		var info = mapFunctions.minMaxToInfo(min, max, game.tileArray.map);
		if(!objectList)
			objectList = {
				asteroid:[],
				obj:[],
				prj:[],
				hitscan:[],
				radial:[]
			};
		for(var row = 0;row<info.repetitions;row++)
			for(var col = 0;col<info.len;col++)
			{
				var theTile = game.tileArray.get(info.start+col+info.offset*row)
				if(theTile)
				{
					for(var key in objectList)
						for(var c = 0;c<theTile[key].count;c++)
							objectList[key].push(theTile[key].get(c));
				}
			}
		return objectList;
	},

	getMinMaxFromObject:function(object, min, max, dt){
		if(object.type=='hitscan')
		{
			min[0] = (object.startX<object.endX)?object.startX:object.endX, min[1] = (object.startY<object.endY)?object.startY:object.endY;
			max[0] = (object.startX>object.endX)?object.startX:object.endX, max[1] = (object.startY>object.endY)?object.startY:object.endY;
		}
		else if(object.type =='radial')
		{
			var vel = Math.abs(object.velocity)*dt;
			min[0] = object.x-object.radius-vel, min[1] = object.y-object.radius-vel;
			max[0] = object.x+object.radius+vel, max[1] = object.y+object.radius+vel;
		}
		else
		{
			var velX = (object.velocityX)?Math.abs(object.velocityX)*dt:0;
			var velY = (object.velocityY)?Math.abs(object.velocityY)*dt:0;
			min[0] = object.x-object.destructible.radius-velX, min[1] = object.y-object.destructible.radius-velY;
			max[0] = object.x+object.destructible.radius+velX, max[1] = object.y+object.destructible.radius+velY;
		}
	},

	//resets the game state
	resetGame:function(game){
		clearFunctions.clearProjectiles(game.projectiles);
		game.ship = {};
		game.ship = constructors.createShip(ships.gull,game);
		
		game.otherShips = [];
		game.otherShipCount = 1;
		for(var c = 0;c<game.maxOtherShips-1;c++)
		{
			var newShip = deepObjectMerge({},(Math.round(Math.random())) ? ships.gull : ships.cheetah);
			newShip.ai = {
				aiFunction:'basic',
				followMin:2500,
				followMax:3000,
				accuracy:.5,
				fireSpread:5
			};
			newShip.faction = Math.floor(Math.random()*game.factions);
			newShip.respawnTime = 5;
			game.otherShips.push(constructors.createShip(newShip, game));
		}
		game.gameState = enums.GAME_STATES.PLAYING;
		game.frameCount = 0;
	},

	pauseGame:function(game){
		game.paused = true;
		game.thrusterSound.volume = 0;
		cancelAnimationFrame(game.animationID);
		gameFunctions.loop.bind(game)();
	},

	resumeGame:function(game){
		cancelAnimationFrame(game.animationID);
		game.paused = false;
		gameFunctions.loop.bind(game)();
	}	
};