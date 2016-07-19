"use strict"

var enums = {
	GAME_STATES:{
		TITLE:0,
		PLAYING:1,
		WIN:2,
		LOSE:3,
		MENU:4,
		TUTORIAL:5
	},
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
			var canvas = game.canvas = document.querySelector('#canvas1');
			constructors.generateStarField.bind(game, game.stars)();
			game.ship = constructors.createShip(ships.cheetah,game.grid, game);
			game.camera = constructors.createCamera(canvas,{x:game.ship.x,y:game.ship.y,rotation:game.ship.rotation,zoom:.5,minZoom:.025,maxZoom:5});
			game.camera.globalCompositeOperation = 'hard-light';
			game.starCamera = constructors.createCamera(canvas);
			game.gridCamera = constructors.createCamera(canvas);
			game.minimapCamera = constructors.createCamera(canvas,{x:game.grid.gridStart[0]+game.grid.gridLines*game.grid.gridSpacing/2,y:game.grid.gridStart[1]+game.grid.gridLines*game.grid.gridSpacing/2,zoom:.001,viewport:{startX:.83,startY:.7,endX:1,endY:1}});

		// start the game loop		
			game.lastTime = Date.now();
			//game.animationID = requestAnimationFrame(game.frame.bind(game));
			gameFunctions.frame.bind(game)();
	},

	//the main this function - called once per frame
	frame:function(){
		this.animationID = requestAnimationFrame(gameFunctions.frame.bind(this));
		var dt = utilities.calculateDeltaTime(this);
		if(dt>this.timeStep*4)
			dt = this.timeStep;
		this.accumulator+=dt;
		while(this.accumulator>=this.timeStep){
			if(!((this.gameState == enums.GAME_STATES.PLAYING || this.gameState == enums.GAME_STATES.TUTORIAL) && this.paused))
				gameFunctions.update(this,this.timeStep);
			this.accumulator-= this.timeStep;
		}
		gameFunctions.draw(this);

		//FPS text
		if (this.debug){
			utilities.fillText(this.camera.ctx,'fps: '+Math.floor(1/dt),15,15,"8pt Orbitron",'white');
			utilities.fillText(this.camera.ctx,'prjs: '+this.projectiles.length,15,30,"8pt Orbitron",'white');
		}
	},

	//one game tick
	update: function(game, dt){
	 	//clear values
		clearFunctions.clearHitscans(game.hitscans);
		clearFunctions.clearDestructibles(game.asteroids.objs);
		clearFunctions.clearDestructibles(game.otherShips); 
		clearFunctions.clearDestructibles(game.updatables);
		clearFunctions.clearDestructibles(game.projectiles);
		clearFunctions.cullDestructibles(game.projectiles, game.grid, .3);

	 	if(game.otherShipCount<game.maxOtherShips)
	 	{
			game.otherShipCount+=game.otherShipCount-game.otherShips.length;
			for(;game.otherShips.length<game.otherShipCount;){ //lol
				game.otherShips.push(constructors.createShip((Math.round(Math.random())) ? ships.gull : ships.cheetah,game.grid, game));
				game.otherShips[game.otherShips.length-1].ai = constructors.createComponentShipAI();
			}
	 	}

		if(game.otherShips.length==0 && game.gameState==enums.GAME_STATES.PLAYING)
		{
			game.gameState = enums.GAME_STATES.WIN;
			game.maxOtherShips*=2;
			game.thrusterSound.volume = 0;
		}
		else if(game.gameState == enums.GAME_STATES.PLAYING && game.ship.destructible.hp<=0)
		{
			game.gameState = enums.GAME_STATES.LOSE;
			game.thrusterSound.volume = 0;
		}
		else if(game.gameState == enums.GAME_STATES.PLAYING || game.gameState==enums.GAME_STATES.TUTORIAL){				

			game.otherShips.forEach(function(ship){
				objControls.objAI(ship,game.ship,dt);
			},game);

			objControls.objKeyboardControl(game.ship,dt);

		 	//camera zoom controls
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_UP] && game.camera.zoom<=game.camera.maxZoom)
				game.camera.zoom*=1.05;
			if(myKeys.keydown[myKeys.KEYBOARD.KEY_DOWN] && game.camera.zoom>=game.camera.minZoom)
				game.camera.zoom*=.95;
			if(myMouse.wheel)
				game.camera.zoom*=1+(myMouse.wheel/500);
			if(game.camera.zoom>game.camera.maxZoom)
				game.camera.zoom = game.camera.maxZoom;
			else if(game.camera.zoom<game.camera.minZoom)
				game.camera.zoom = game.camera.minZoom;

		 	//update ship, center main camera on ship
			//game.updateShip(game.ship,dt);
			updaters.updateUpdatable(game.ship,dt);
			game.otherShips.forEach(function(ship){
				updaters.updateUpdatable(ship,dt);
			},game);

			for(var i = 0; i<game.projectiles.length; i++){
				updaters.updateMobile(game.projectiles[i], dt);
			}

			gameFunctions.checkCollisions(game, dt);	

			if(game.gameState == enums.GAME_STATES.TUTORIAL && myKeys.keydown[myKeys.KEYBOARD.KEY_ENTER]){
				gameFunctions.resetGame(game);
				game.gameState = enums.GAME_STATES.PLAYING;
			}			
		}
		else if(game.gameState == enums.GAME_STATES.TITLE && myKeys.keydown[myKeys.KEYBOARD.KEY_ENTER])
		{
			game.gameState = enums.GAME_STATES.TUTORIAL;
			myKeys.keydown[myKeys.KEYBOARD.KEY_ENTER] = false;
			//game.resetGame();
		}
		else if((game.gameState == enums.GAME_STATES.WIN || game.gameState == enums.GAME_STATES.LOSE) && myKeys.keydown[myKeys.KEYBOARD.KEY_R])
			gameFunctions.resetGame(game);

	 	//camera shenanigans
		game.camera.x = lerp(game.camera.x,game.ship.x+game.ship.velocityX/10,12*dt);// game.ship.forwardVectorX*(game.camera.height/6)*(1/game.camera.zoom);
		game.camera.y = lerp(game.camera.y,game.ship.y+game.ship.velocityY/10,12*dt);// game.ship.forwardVectorY*(game.camera.height/6)*(1/game.camera.zoom);
		var rotDiff = game.ship.rotation+game.ship.rotationalVelocity/10 - game.camera.rotation;
		if(rotDiff>180)
			rotDiff-=360;
		else if(rotDiff<-180)
			rotDiff+=360;
		game.camera.rotation += lerp(0,rotDiff,12*dt);
		if(game.camera.rotation>180)
			game.camera.rotation-=360;
		else if(game.camera.rotation<-180)
			game.camera.rotation+=360;
		game.starCamera.x = game.camera.x;
	 	game.starCamera.y = game.camera.y;
	 	game.starCamera.rotation = game.camera.rotation;
	 	game.gridCamera.x = game.camera.x;
	 	game.gridCamera.y = game.camera.y;
	 	game.gridCamera.rotation = game.camera.rotation;
	 	var cameraDistance = 1/game.camera.zoom;
	 	game.starCamera.zoom = 1/(cameraDistance+10000);
	 	game.gridCamera.zoom = 1/(cameraDistance+5);

		//game needs to be done
		resetMouse();

		if(game.thrusterSound && (game.gameState == enums.GAME_STATES.PLAYING || game.gameState == enums.GAME_STATES.TUTORIAL))
			game.thrusterSound.volume = (game.paused)?0:game.ship.thrusters.noiseLevel*2*(1-(1-game.camera.zoom)/game.soundLevel);

		//because we might use the frame count for something at some point
		game.frameCount++;
	},

	//renders everything
	draw:function(game){

		//console.log('drawing');
		//pause screen
	 	if((game.gameState == enums.GAME_STATES.PLAYING || game.gameState == enums.GAME_STATES.TUTORIAL) && game.paused){
	 		//dt = 0;
	 		drawing.drawPauseScreen(game.camera);
	 		drawing.drawLockedGraphic(game.camera);
	 		//game.drawPauseScreen(game.worldCamera);
	 		return;
	 	}		

		//clear cameras
		drawing.clearCamera(game.camera);
		//drawing.clearCamera(game.starCamera);
		//game.clearCamera(game.minimapCamera);

		//draw grids then asteroids then ships
		if(game.drawStarField)
			drawing.drawAsteroids(game.stars,game.starCamera);		
		
		if(game.gameState == enums.GAME_STATES.PLAYING || game.gameState == enums.GAME_STATES.TUTORIAL)
		{
			drawing.drawGrid(game.gridCamera, game.grid);
			drawing.drawAsteroidsOverlay(game.asteroids,game.camera,game.gridCamera);
			for(var n = game.otherShips.length-1;n>=-1;n--){
				var ship = (n==-1)?game.ship:game.otherShips[n];
				drawing.drawShipOverlay(ship,game.camera,game.gridCamera);
			}
			drawing.drawProjectiles(game.projectiles, game.camera);
			drawing.drawHitscans(game.hitscans, game.camera);
			for(var c = game.otherShips.length-1;c>=-1;c--){
				var ship = (c==-1)?game.ship:game.otherShips[c];
				drawing.drawShip(ship,game.camera);
			}
			
			drawing.drawAsteroids(game.asteroids,game.camera, game.gridCamera);
			drawing.drawHUD(game.camera, game.ship);
			drawing.drawMinimap(game.minimapCamera, game);
			if(game.gameState == enums.GAME_STATES.TUTORIAL)
				drawing.drawTutorialGraphics(game.camera);
		}
		else if(game.gameState == enums.GAME_STATES.TITLE)
		{
			drawing.drawAsteroids(game.asteroids,game.camera,game.gridCamera);
			drawing.drawTitleScreen(game.camera);
		}
		else if(game.gameState == enums.GAME_STATES.WIN){
			drawing.drawGrid(game.gridCamera, game.grid);
			drawing.drawAsteroids(game.asteroids,game.camera,game.gridCamera);
			drawing.drawWinScreen(game.camera);
		}
		else if(game.gameState == enums.GAME_STATES.LOSE){
			drawing.drawGrid(game.gridCamera, game.grid);
			drawing.drawAsteroids(game.asteroids,game.camera,game.gridCamera);
			drawing.drawLoseScreen(game.camera);
		}		

		drawing.drawLockedGraphic(game.camera);
	},	

	checkCollisions:function(game, dt){
		//laser collisions
			game.hitscans.forEach(function(hitscan){
				if(hitscan.power == 0)
					return;
				hitscan.nextHitscan = constructors.createNextHitscanObject(hitscan, dt);
				var obj; //the chosen object
				var tValOfObj = Number.MAX_VALUE;
				var xInv = hitscan.endX<hitscan.startX;
				var yInv = hitscan.endY<hitscan.startY;
				var start = [(xInv) ? hitscan.endX : hitscan.startX, (yInv) ? hitscan.endY : hitscan.startY];
				var end = [(xInv) ? hitscan.startX : hitscan.endX, (yInv) ? hitscan.startY : hitscan.endY];
				var hitscanVertices = [
					[hitscan.startX, hitscan.startY],
					[hitscan.endX, hitscan.endY],
					[hitscan.nextHitscan.endX,hitscan.nextHitscan.endY],
					[hitscan.nextHitscan.startX, hitscan.nextHitscan.startY]
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
					for(var c = -1;c<game.otherShips.length;c++){
						var gameObj = ((c==-1) ? game.ship : game.otherShips[c]); //lol
						if(gameObj == hitscan.owner)
							continue;
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
							console.log('hitscan-projectile collision');
						}
					}

				//resolve collision
					if(obj)
						hitscan.collisionFunction(hitscan, obj, tValOfObj, dt);
			},game);

		//projectile collisions
			for(var n = 0; n<game.projectiles.length; n++){
				var prj = game.projectiles[n];
				var prjNext = [prj.x+prj.velocityX*dt, prj.y+prj.velocityY*dt];
				var prjCapsule = {center1:[prj.x,prj.y], center2:prjNext, radius:prj.destructible.radius};
				//var prjCapsule = {center1:[prj.x,prj.y], center2:[prj.x+prj.prevX, prj.y+prj.prevY], radius:prj.destructible.radius};
				//projectile-ship
					for(var c = -1;c<game.otherShips.length;c++){
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
							/*var magnitude = Math.sqrt(prj.velocityX * prj.velocityX + prj.velocityY * prj.velocityY);
							var damage = magnitude * prj.destructible.maxHp * prj.destructible.radius/gameObj.destructible.radius;
							prj.destructible.hp-=damage;
							gameObj.destructible.hp-=damage;*/
							prj.collisionFunction(prj, gameObj, dt);
						}
					}
			}

		//asteroid collisions
			for(var c = -1;c<game.otherShips.length;c++){
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
	},		

	//resets the game state
	resetGame:function(game){
		clearFunctions.clearProjectiles(game.projectiles);
		game.ship = {};
		game.ship = constructors.createShip(ships.cheetah,game.grid, game);
		constructors.makeAsteroids.bind(game,game.asteroids,game.grid)();
		game.otherShips = [];
		game.otherShipCount = 1;
		for(var c = 0;c<game.otherShipCount;c++)
		{
			game.otherShips.push(constructors.createShip((Math.round(Math.random())) ? ships.gull : ships.cheetah,game.grid, game));
			game.otherShips[c].ai = constructors.createComponentShipAI();
		}
		game.gameState = enums.GAME_STATES.PLAYING;
		game.frameCount = 0;
	},

	pauseGame:function(game){
		game.paused = true;
		game.thrusterSound.volume = 0;
		cancelAnimationFrame(game.animationID);
		gameFunctions.frame.bind(game)();
	},

	resumeGame:function(game){
		cancelAnimationFrame(game.animationID);
		game.paused = false;
		gameFunctions.frame.bind(game)();
	}	
};