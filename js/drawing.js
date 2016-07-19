"use strict"

var drawing = {
	//clears the given camera's canvas
	clearCamera:function(camera){
		var ctx = camera.ctx;
		ctx.fillStyle = "black"; 
		ctx.fillRect(0,0,camera.width,camera.height);
		ctx.fill();
	},	

	//draws the grid in the given camera
	drawGrid:function(camera, grid, minimap){
		var ctx = camera.ctx;
		var gridLines = grid.gridLines;
		var gridSpacing = grid.gridSpacing;
		var gridStart = grid.gridStart;

		for(var c = 0;c<grid.colors.length;c++){	
			if(minimap && !grid.colors[c].minimap)
				continue;		
			ctx.save();
			ctx.beginPath();
			for(var x = 0;x<=gridLines;x++){
				if(x%grid.colors[c].interval != 0)
						continue;
				var correctInterval = true;
				for(var n = 0;n<c;n++)
				{
					if(x%grid.colors[n].interval == 0 && (!minimap || grid.colors[n].minimap))
					{
						correctInterval = false;
						break;
					}
				}
				if(correctInterval!=true)
					continue;
				//define start and end points for current line in world space
				var start = [gridStart[0]+x*gridSpacing,gridStart[1]];
				var end = [start[0],gridStart[1]+gridLines*gridSpacing];
				//convert to camera space
				start = worldPointToCameraSpace(start[0],start[1],camera);
				end = worldPointToCameraSpace(end[0],end[1],camera);			
				ctx.moveTo(start[0],start[1]);
				ctx.lineTo(end[0],end[1]);
			}
			for(var y = 0;y<=gridLines;y++){
				if(y%grid.colors[c].interval != 0)
						continue;
				var correctInterval = true;
				for(var n = 0;n<c;n++)
				{
					if(y%grid.colors[n].interval == 0 && (!minimap || grid.colors[n].minimap))
					{
						correctInterval = false;
						break;
					}
				}
				if(correctInterval!=true)
					continue;
				//same as above, but perpendicular
				var start = [gridStart[0],gridStart[0]+y*gridSpacing];
				var end = [gridStart[0]+gridLines*gridSpacing,start[1]];
				start = worldPointToCameraSpace(start[0],start[1],camera);
				end = worldPointToCameraSpace(end[0],end[1],camera);
				ctx.moveTo(start[0],start[1]);
				ctx.lineTo(end[0],end[1]);
			}
			//draw all lines, stroke last
			ctx.globalAlpha = .3;
			ctx.strokeWidth = 5;
			ctx.strokeStyle = grid.colors[c].color;
			ctx.stroke();
			ctx.restore();
		}
	},
	//draws the projected overlay (shields, health, laser range) for the given ship using the two given cameras (one for the gameplay plane and one for the projected plane)
	drawShipOverlay:function(ship,camera,gridCamera){
		var ctx = camera.ctx;
		
		var shipPosInCameraSpace = worldPointToCameraSpace(ship.x,ship.y,camera); //get ship's position in camera space
		var shipPosInGridCameraSpace = worldPointToCameraSpace(ship.x,ship.y,gridCamera);
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(shipPosInCameraSpace[0],shipPosInCameraSpace[1]);
		ctx.lineTo(shipPosInGridCameraSpace[0],shipPosInGridCameraSpace[1]);
		ctx.translate(shipPosInGridCameraSpace[0],shipPosInGridCameraSpace[1]);
		ctx.rotate((ship.rotation-gridCamera.rotation) * (Math.PI / 180));
		var range = (ship.hasOwnProperty("laser"))?ship.laser.range:3000;
		ctx.arc(0,0,range*gridCamera.zoom,-Math.PI/2,Math.PI*2-Math.PI/2);			
		ctx.rotate(-(ship.rotation-gridCamera.rotation) * (Math.PI / 180));
		ctx.translate(-shipPosInGridCameraSpace[0],-shipPosInGridCameraSpace[1]);
		ctx.lineWidth = .5;
		ctx.strokeStyle = 'grey';
		ctx.globalAlpha = .2;
		ctx.stroke();

		ctx.globalAlpha = .5;
		ctx.translate(shipPosInGridCameraSpace[0],shipPosInGridCameraSpace[1]);
		ctx.scale(gridCamera.zoom,gridCamera.zoom);
		ctx.beginPath();
		ctx.arc(0,0,750,-Math.PI/2,-Math.PI*2*(ship.destructible.shield.current/ship.destructible.shield.max)-Math.PI/2,true);
		ctx.strokeStyle = 'dodgerblue';
		ctx.lineWidth = 100;
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(0,0,600,-Math.PI/2,-Math.PI*2*(ship.destructible.hp/ship.destructible.maxHp)-Math.PI/2,true);
		ctx.strokeStyle = 'green';
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(0,0,300,0,Math.PI*2);
		ctx.fillStyle = ship.color;
		ctx.fill();			
		ctx.beginPath();
		ctx.arc(0,0,ship.destructible.radius,0,Math.PI*2);
		ctx.fillStyle = 'black';
		ctx.globalAlpha = 1;
		ctx.fill();
		ctx.restore();
	},

	//draws the give ship's minimap representation to the given camera
	drawShipMinimap:function(ship,camera){
		var ctx = camera.ctx;
		ctx.save();
		var shipPosInCameraSpace = worldPointToCameraSpace(ship.x,ship.y,camera); //get ship's position in camera space
		ctx.translate(shipPosInCameraSpace[0],shipPosInCameraSpace[1]); //translate to camera space position
		ctx.rotate((ship.rotation-camera.rotation) * (Math.PI / 180)); //rotate by difference in rotations

		ctx.scale(.5,.5); //scale by zoom value

		//ctx.translate(0,7);
		ctx.beginPath();
		ctx.moveTo(ship.model.vertices[0][0],ship.model.vertices[0][1]);
		for(var c = 1;c<ship.model.vertices.length;c++)
		{
			var vert = ship.model.vertices[c];
			ctx.lineTo(vert[0],vert[1]);
		}
		ctx.closePath();
		ctx.fillStyle = ship.color;
		ctx.fill();
		ctx.restore();
	},

	//draws the given ship in the given camera
	drawShip: function(ship, camera){
		//var shipArray = (Array.isArray(ship))?ship:[ship];

		var shipPosInCameraSpace = worldPointToCameraSpace(ship.x,ship.y,camera); //get ship's position in camera space

		if(shipPosInCameraSpace[0] - ship.destructible.radius * camera.zoom > camera.width || shipPosInCameraSpace[0] + ship.destructible.radius * camera.zoom< 0
			|| shipPosInCameraSpace[1] - ship.destructible.radius * camera.zoom> camera.height || shipPosInCameraSpace[1] + ship.destructible.radius * camera.zoom< 0)
			return;

		var ctx = camera.ctx;
		ctx.save();
		ctx.translate(shipPosInCameraSpace[0],shipPosInCameraSpace[1]); //translate to camera space position
		ctx.rotate((ship.rotation-camera.rotation) * (Math.PI / 180)); //rotate by difference in rotations

		ctx.scale(camera.zoom,camera.zoom); //scale by zoom value

		//collider
		/*ctx.save();
		ctx.fillStyle = 'red';
		ctx.beginPath();
		ctx.arc(0,0,ship.destructible.radius,0,Math.PI*2);
		ctx.fill();
		ctx.restore();*/

		//ctx.translate(0,7);

		//Thrusters
		var width = ship.model.thrusterPoints.width;
			//forward thrust
			for(var c = 0;c<=thrusterDetail;c++){
				ctx.fillStyle = shadeRGBColor(ship.thrusters.color,.5*c);
				ctx.save();
				ctx.beginPath();

				//Medial Thrusters
					//forward
						var trailLength = 40*(ship.thrusters.medial.currentStrength/ship.thrusters.medial.efficiency)*(1-(c/(thrusterDetail+1)));
						if(ship.thrusters.medial.currentStrength>0){
							for(var n = 0; n<ship.model.thrusterPoints.medial.positive.length;n++)
							{
								var tp = ship.model.thrusterPoints.medial.positive[n];
								ctx.moveTo(tp[0]+rightVector[0]*width/2,tp[1]+rightVector[1]*width/2);
								ctx.lineTo(tp[0]-rightVector[0]*width/2,tp[1]-rightVector[1]*width/2);
								ctx.lineTo(tp[0]+upVector[0]*trailLength,tp[1]+upVector[1]*trailLength); //furthest point goes outward with thruster strength and scales inward with efficiency
								ctx.lineTo(tp[0]+rightVector[0]*width/2,tp[1]+rightVector[1]*width/2);
							}
						}
					//backward
						else if(ship.thrusters.medial.currentStrength<0){
							for(var n = 0; n<ship.model.thrusterPoints.medial.positive.length;n++)
							{
								var tp = ship.model.thrusterPoints.medial.negative[n];
								ctx.moveTo(tp[0]+rightVector[0]*width/2,tp[1]+rightVector[1]*width/2);
								ctx.lineTo(tp[0]-rightVector[0]*width/2,tp[1]-rightVector[1]*width/2);
								ctx.lineTo(tp[0]+upVector[0]*trailLength,tp[1]+upVector[1]*trailLength); //furthest point goes outward with thruster strength and scales inward with efficiency
								ctx.lineTo(tp[0]+rightVector[0]*width/2,tp[1]+rightVector[1]*width/2);
							}
						}	

				//rotational thrusters	
					trailLength = 40*(ship.thrusters.rotational.currentStrength/ship.thrusters.rotational.efficiency)*(1-(c/(thrusterDetail+1)));
					//ccw
						if(ship.thrusters.rotational.currentStrength>0){
							for(var n = 0; n<ship.model.thrusterPoints.rotational.positive.length;n++)
							{
								var tp = ship.model.thrusterPoints.rotational.positive[n];
								ctx.moveTo(tp[0]+upVector[0]*width/2,tp[1]+upVector[1]*width/2);
								ctx.lineTo(tp[0]-upVector[0]*width/2,tp[1]-upVector[1]*width/2);
								ctx.lineTo(tp[0]+rightVector[0]*trailLength,tp[1]+rightVector[1]*trailLength); //furthest point goes outward with thruster strength and scales inward with efficiency
								ctx.lineTo(tp[0]+upVector[0]*width/2,tp[1]+upVector[1]*width/2);
							}
						}
					//cw
						else if(ship.thrusters.rotational.currentStrength<0){
							for(var n = 0; n<ship.model.thrusterPoints.rotational.negative.length;n++)
							{
								var tp = ship.model.thrusterPoints.rotational.negative[n];
								ctx.moveTo(tp[0]+upVector[0]*width/2,tp[1]+upVector[1]*width/2);
								ctx.lineTo(tp[0]-upVector[0]*width/2,tp[1]-upVector[1]*width/2);
								ctx.lineTo(tp[0]+rightVector[0]*trailLength,tp[1]+rightVector[1]*trailLength); //furthest point goes outward with thruster strength and scales inward with efficiency
								ctx.lineTo(tp[0]+upVector[0]*width/2,tp[1]+upVector[1]*width/2);
							}
						}

				//lateral thrusters
					trailLength = 40*(ship.thrusters.lateral.currentStrength/ship.thrusters.lateral.efficiency)*(1-(c/(thrusterDetail+1)));
					//rightward
						if(ship.thrusters.lateral.currentStrength>0){
							for(var n = 0; n<ship.model.thrusterPoints.lateral.positive.length;n++)
							{
								var tp = ship.model.thrusterPoints.lateral.positive[n];
								ctx.moveTo(tp[0]+upVector[0]*width/2,tp[1]+upVector[1]*width/2);
								ctx.lineTo(tp[0]-upVector[0]*width/2,tp[1]-upVector[1]*width/2);
								ctx.lineTo(tp[0]+rightVector[0]*trailLength,tp[1]+rightVector[1]*trailLength); //furthest point goes outward with thruster strength and scales inward with efficiency
								ctx.lineTo(tp[0]+upVector[0]*width/2,tp[1]+upVector[1]*width/2);
							}
						}
					//leftward
						else if(ship.thrusters.lateral.currentStrength<0){
							//ctx.save();				
							//ctx.beginPath();
							/*ctx.moveTo(10,0);
							ctx.lineTo(10,-5);
							ctx.lineTo(10-40*(ship.thrusters.lateral.currentStrength/ship.thrusters.lateral.efficiency)*(1-(c/(this.thrusterDetail+1))),-2.5);
							ctx.lineTo(10,0);*/
							//ctx.globalAlpha = ((c+1)/(this.thrusterDetail+1));
							//ctx.fill();
							//ctx.restore();
							for(var n = 0; n<ship.model.thrusterPoints.lateral.negative.length;n++)
							{
								var tp = ship.model.thrusterPoints.lateral.negative[n];
								ctx.moveTo(tp[0]+upVector[0]*width/2,tp[1]+upVector[1]*width/2);
								ctx.lineTo(tp[0]-upVector[0]*width/2,tp[1]-upVector[1]*width/2);
								ctx.lineTo(tp[0]+rightVector[0]*trailLength,tp[1]+rightVector[1]*trailLength); //furthest point goes outward with thruster strength and scales inward with efficiency
								ctx.lineTo(tp[0]+upVector[0]*width/2,tp[1]+upVector[1]*width/2);
							}
						}

				ctx.globalAlpha = ((c+1)/(this.thrusterDetail+1));
				ctx.fill();
				ctx.restore();
			}

		//shields
			var shieldCoeff = (ship.destructible.shield.max/ship.destructible.shield.efficiency);
			ctx.save();
			ctx.fillStyle = 'dodgerblue';
			ctx.beginPath();
			//ctx.arc(0,-5,30,0,Math.PI*2);
			/*ctx.moveTo(-20-1*shieldCoeff,10+1*shieldCoeff);
			ctx.lineTo(0,0+.5*shieldCoeff);
			ctx.lineTo(20+1*shieldCoeff,10+1*shieldCoeff);
			ctx.lineTo(0,-30-1.2*shieldCoeff);*/
			for(var n = 0; n<ship.model.shieldVectors.length; n++){
				var vert = ship.model.vertices[n];
				var vec = ship.model.shieldVectors[n];
				var shieldVert = [vert[0]+vec[0]*shieldCoeff,vert[1]+vec[1]*shieldCoeff];
				if(n==0)
					ctx.moveTo(shieldVert[0],shieldVert[1]);
				else
					ctx.lineTo(shieldVert[0],shieldVert[1]);
			}
			ctx.globalAlpha = ship.destructible.shield.current/ship.destructible.shield.max;
			ctx.fill();
			ctx.restore();

		//the rest of the ship
			ctx.beginPath();
			ctx.moveTo(ship.model.vertices[0][0],ship.model.vertices[0][1]);
			for(var c = 1;c<ship.model.vertices.length;c++)
			{
				var vert = ship.model.vertices[c];
				ctx.lineTo(vert[0],vert[1]);
			}
			ctx.closePath();
			ctx.fillStyle = ship.color;
			ctx.fill();
			ctx.restore();
	},

	//draws all laser objects in the given array to the given camera
	drawLasers:function(lasers,camera){
		var ctx = camera.ctx;
		lasers.forEach(function(laser){
			if(laser.power == 0)
				return;
			var start = worldPointToCameraSpace(laser.startX,laser.startY,camera);
			var end = worldPointToCameraSpace(laser.endX,laser.endY,camera);
			var startNext = worldPointToCameraSpace(laser.nextLaser.startX,laser.nextLaser.startY,camera);
			var endNext = worldPointToCameraSpace(laser.nextLaser.endX,laser.nextLaser.endY,camera);
			var angle = angleBetweenVectors(end[0]-start[0],end[1]-start[1],1,0);
			var rightVector = rotate(0,0,1,0,angle+90	);
			var width = (laser.power/laser.efficiency)*camera.zoom;
			if(width<.8)
				width = .8;
			for(var c = 0;c<=laserDetail;c++)
			{
				var coeff = 1-(c/(laserDetail+1));
				ctx.save();
				ctx.beginPath();
				ctx.moveTo(start[0],start[1]);
				ctx.lineTo(start[0]+coeff*width*rightVector[0]/2,start[1]+width*rightVector[1]/2);
				ctx.lineTo(end[0],end[1]);
				ctx.lineTo(start[0]-coeff*width*rightVector[0]/2,start[1]-width*rightVector[1]/2);
				ctx.arc(start[0],start[1],coeff*width/2,-(angle-90)*(Math.PI/180),(angle-90)*(Math.PI/180)-90,false);
				ctx.fillStyle = shadeRGBColor(laser.color,0+c/(laserDetail+1));
				/*ctx.lineTo(end[0], end[1]);
				ctx.lineTo(endNext[0], endNext[1]);
				ctx.lineTo(startNext[0], startNext[1]);
				ctx.fillStyle = laser.color;*/
				ctx.fill();
				ctx.restore();
			}
		},this);
	},

	//draws all projectile objects in the given array to the given camera
	drawProjectiles: function(projectiles, camera){
		var ctx = camera.ctx;
		for(var c = 0;c< projectiles.length;c++){
			var prj = projectiles[c];
			if(!prj.visible)
				continue;
			var start = worldPointToCameraSpace(prj.x, prj.y, camera);
			var end = worldPointToCameraSpace(prj.x+prj.velocityX*.012, prj.y+prj.velocityY*.012, camera);

			if(start[0] > camera.width+prj.destructible.radius || start[0] < 0 - prj.destructible.radius || start[1] > camera.height + prj.destructible.radius || start[1] < 0 - prj.destructible.radius)
				continue;

			ctx.save();
			ctx.beginPath();
			ctx.moveTo(start[0], start[1]);
			ctx.lineTo(end[0], end[1]);
			ctx.strokeStyle = prj.color;
			var width = prj.destructible.radius*camera.zoom;
			ctx.lineWidth = (width>1)?width:1;
			ctx.stroke();
			ctx.restore();
		}
	},

	//draws the projected overlay for all asteroids in the given array to the given main and projected cameras
	drawAsteroidsOverlay:function(asteroids, camera, gridCamera){
		var start = [0,0];
		var end = [camera.width,camera.height];
		var ctx = camera.ctx;
		var cameraPositions = [];
		if(gridCamera)
		{
			ctx.save();
			ctx.beginPath();
			for(var c = 0; c<asteroids.objs.length;c++)
			{
				var asteroid = asteroids.objs[c];
				var gridPosition = worldPointToCameraSpace(asteroid.x,asteroid.y,gridCamera);
				if(gridPosition[0] + asteroid.destructible.radius*gridCamera.zoom<start[0] || gridPosition[0] - asteroid.destructible.radius*gridCamera.zoom>end[0] || gridPosition[1] + asteroid.destructible.radius*gridCamera.zoom<start[1] || gridPosition[1] - asteroid.destructible.radius*gridCamera.zoom>end[1])
					continue;			
				cameraPositions[c] =(worldPointToCameraSpace(asteroid.x,asteroid.y,camera));
				ctx.moveTo(cameraPositions[c][0],cameraPositions[c][1]);
				ctx.lineTo(gridPosition[0],gridPosition[1]);
				ctx.moveTo(gridPosition[0],gridPosition[1]);
				//ctx.beginPath();
				ctx.arc(gridPosition[0],gridPosition[1], asteroid.destructible.radius*gridCamera.zoom,0,Math.PI*2);
			}	
			ctx.strokeStyle = 'grey';
			ctx.lineWidth = .5;
			ctx.globalAlpha = .5;
			ctx.stroke();
			ctx.restore();		
		}
	},

	//draws asteroids from the given asteroids array to the given camera
	drawAsteroids: function(asteroids,camera){
		var start = [0,0];
		var end = [camera.width,camera.height];
		var ctx = camera.ctx;
		for(var group = 0;group<asteroids.colors.length;group++){
			ctx.save()
			ctx.fillStyle = asteroids.colors[group];
			ctx.beginPath();
			for(var c = 0;c<asteroids.objs.length;c++){
				var asteroid = asteroids.objs[c];
				if(asteroid.colorIndex!=group)
					continue;

				var finalPosition = worldPointToCameraSpace(asteroid.x,asteroid.y,camera); //get asteroid's position in camera space
				
				if(finalPosition[0] + asteroid.radius*camera.zoom<start[0] || finalPosition[0]-asteroid.radius*camera.zoom>end[0] || finalPosition[1] + asteroid.radius*camera.zoom<start[1] || finalPosition[1]-asteroid.radius*camera.zoom>end[1])
						continue;
				ctx.moveTo(finalPosition[0],finalPosition[1]);
				ctx.arc(finalPosition[0],finalPosition[1],asteroid.radius*camera.zoom,0,Math.PI*2);
			};
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		};
	},

	//draws the heads-up display to the given camera
	drawHUD: function(camera, ship){
		var ctx = camera.ctx;
		ctx.save(); // NEW
		ctx.textAlign = 'center';
		ctx.textBaseline = 'center';
		//utilities.fillText(ctx, "Shields: "+Math.round(this.ship.destructible.shield.current),camera.width/15,7.5*camera.height/10,"12pt Prime",'white')
		//utilities.fillText(ctx, "HP: "+Math.round(this.ship.destructible.hp),camera.width/15,8*camera.height/10,"12pt Prime",'white')
		ctx.fillRect(0,camera.height,camera.width,-30);
		utilities.fillText(ctx, ((ship.stabilizer.enabled)?'assisted':'manual'),camera.width/2,camera.height-10,"bold 12pt Orbitron",(ship.stabilizer.enabled)?'green':'red');
		ctx.textAlign = 'left';
		utilities.fillText(ctx,'limiter',10,camera.height-10,"8pt Orbitron",'white');
		if(ship.stabilizer.clamps.enabled)
		{
			ctx.textAlign = 'right';
			utilities.fillText(ctx,Math.round(ship.stabilizer.clamps.medial),110,camera.height-10,"10pt Orbitron",'green');
			utilities.fillText(ctx,Math.round(ship.stabilizer.clamps.lateral),160,camera.height-10,"10pt Orbitron",'cyan');
			utilities.fillText(ctx,Math.round(ship.stabilizer.clamps.rotational),195,camera.height-10,"10pt Orbitron",'yellow');
		}
		else
		{
			ctx.textAlign = 'left';
			utilities.fillText(ctx,'disabled',110,camera.height-10,"10pt Orbitron",'red');
		}
		//utilities.fillText(ctx, "Thruster clamps: "+((this.ship.stabilizer.clamps.enabled)?'Medial '+Math.round(this.ship.stabilizer.clamps.medial)+' Lateral '+Math.round(this.ship.stabilizer.clamps.lateral)+' Rotational '+Math.round(this.ship.stabilizer.clamps.rotational):'disabled'),0,camera.height-10,"12pt Prime",'white')
		ctx.textAlign = 'right';
		utilities.fillText(ctx,'T '+Math.round(updaters.getPowerForComponent(ship.powerSystem,enums.SHIP_COMPONENTS.THRUSTERS)*100)+'%',camera.width-220,camera.height-10,"10pt Orbitron",'green');
		utilities.fillText(ctx,' L '+Math.round(updaters.getPowerForComponent(ship.powerSystem,enums.SHIP_COMPONENTS.LASERS)*100)+'%',camera.width-120,camera.height-10,"10pt Orbitron",'red');
		utilities.fillText(ctx,' S '+Math.round(updaters.getPowerForComponent(ship.powerSystem,enums.SHIP_COMPONENTS.SHIELDS)*100)+'%',camera.width-20,camera.height-10,"10pt Orbitron",'dodgerblue');
		//utilities.fillText(ctx, "Overcharge: Thrusters "+Math.round(this.getPowerForComponent(this.ship.powerSystem,this.SHIP_COMPONENTS.THRUSTERS)*100)+'% Laser '+Math.round(this.getPowerForComponent(this.ship.powerSystem,this.SHIP_COMPONENTS.LASERS)*100)+'% Shields '+Math.round(this.getPowerForComponent(this.ship.powerSystem,this.SHIP_COMPONENTS.SHIELDS)*100)+'%',camera.width,camera.height-10,"10pt Orbitron",'white')
		ctx.restore(); // NEW
	},

	//draws the minimap to the given camera
	//note that the minimap camera has a viewport
	drawMinimap:function(camera, game){
		var ctx = camera.ctx;
		var viewportStart = [camera.width*camera.viewport.startX,camera.height*camera.viewport.startY];
		var viewportEnd = [camera.width*camera.viewport.endX,camera.height*camera.viewport.endY];
		var viewportDimensions = [viewportEnd[0]-viewportStart[0],viewportEnd[1]-viewportStart[1]];
		ctx.save();
		ctx.translate(0,-30);
		//ctx.rect(viewportStart[0],viewportStart[1]-30,viewportDimensions[0],viewportDimensions[1]);
		//ctx.clip();
		ctx.beginPath();
		ctx.rect(viewportStart[0],viewportStart[1],viewportDimensions[0],viewportDimensions[1]);
		ctx.fillStyle = 'black';
		ctx.fill();
		ctx.clip();
		ctx.translate((viewportStart[0]+viewportDimensions[0]/2-camera.width/2),(viewportStart[1]+viewportDimensions[1]/2-camera.height/2));
		//ctx.translate(600,300);
		drawing.drawGrid(game.minimapCamera, game.grid, true);
		drawing.drawAsteroids(game.asteroids,game.minimapCamera);
		for(var n = game.otherShips.length-1;n>=-1;n--){
			var ship = (n==-1)?game.ship:game.otherShips[n];
			drawing.drawShipMinimap(ship,game.minimapCamera);
		}
		ctx.restore();
	},

	drawTitleScreen:function(camera){
		var ctx = camera.ctx;
		ctx.save();
		ctx.fillStyle = 'black';
		ctx.globalAlpha = .5;
		ctx.fillRect(0,0,camera.width,camera.height);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.globalAlpha = 1;
		utilities.fillText(ctx,"Space Battle With Lasers",camera.width/2,camera.height/5,"bold 64pt Aroma",'blue',.5);
		utilities.fillText(ctx,"SPACE BATTLE WITH LASERS",camera.width/2,camera.height/5,"bold 24pt Aroma",'white');
		utilities.fillText(ctx,"Press ENTER to start",camera.width/2,4*camera.height/5,"12pt Orbitron",'white');
		ctx.restore();
	},

	drawWinScreen:function(camera){
		var ctx = camera.ctx;
		ctx.save();
		ctx.fillStyle = 'black';
		ctx.globalAlpha = .5;
		ctx.fillRect(0,0,camera.width,camera.height);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.globalAlpha = 1;
		utilities.fillText(ctx,"You win!",camera.width/2,camera.height/5,"24pt Aroma",'white');
		utilities.fillText(ctx,"Good for you. Press R to continue.",camera.width/2,4*camera.height/5,"12pt Orbitron",'white');
		ctx.restore();		
	},

	drawLoseScreen:function(camera){
		var ctx = camera.ctx;
		ctx.save();
		ctx.fillStyle = 'black';
		ctx.globalAlpha = .5;
		ctx.fillRect(0,0,camera.width,camera.height);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.globalAlpha = 1;
		utilities.fillText(ctx,"You lose!",camera.width/2,camera.height/5,"24pt Aroma",'white');
		utilities.fillText(ctx,"Sucks to be you. Press R to try again.",camera.width/2,4*camera.height/5,"12pt Orbitron",'white');
		ctx.restore();		
	},

	//draw pause screen in the given camera
	drawPauseScreen:function(camera){
		var ctx = camera.ctx;
		ctx.save();
		ctx.fillStyle = "black",
		ctx.globalAlpha = .03;
		ctx.fillRect(0,0,camera.width,camera.height);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.globalAlpha = 1;
		utilities.fillText(ctx,"Paused",camera.width/2,camera.height/5,"24pt Aroma",'white');
		ctx.restore();
	},

	//draws the "click me" graphic
	drawLockedGraphic:function(camera){
		if(locked)
			return;
		var ctx = camera.ctx;
		ctx.save();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		utilities.fillText(ctx,"Click me",camera.width/2,camera.height/2,"10pt Orbitron",'white');
		ctx.restore();
	},

	drawTutorialGraphics:function(camera){
		var ctx = camera.ctx;
		ctx.save();
		ctx.textAlign = 'left';
		utilities.fillText(ctx,"WASD moves your ship",camera.width/10,camera.height/12,"10pt Orbitron",'white');
		utilities.fillText(ctx,"LEFT and RIGHT arrow or mouse turns your ship",camera.width/10,2*camera.height/12,"10pt Orbitron",'white');		
		utilities.fillText(ctx,"UP and DOWN arrow or mouse-wheel zooms the camera",camera.width/10,3*camera.height/12,"10pt Orbitron",'white');
		utilities.fillText(ctx,"SPACE or LEFT-CLICK fires your laser",camera.width/10,4*camera.height/12,"10pt Orbitron",'white');
		utilities.fillText(ctx,"SHIFT over-charges your thrusters",camera.width/10,5*camera.height/12,"10pt Orbitron",'white');
		utilities.fillText(ctx,"ALT over-charges your shield",camera.width/10,6*camera.height/12,"10pt Orbitron",'white');
		utilities.fillText(ctx,"RIGHT-CLICK over-charges your laser",camera.width/10,7*camera.height/12,"10pt Orbitron",'white');
		utilities.fillText(ctx,"C toggles the velocity limiter",camera.width/10,8*camera.height/12,"10pt Orbitron",'white');
		utilities.fillText(ctx,"TAB switches between assisted and manual controls",camera.width/10,9*camera.height/12,"10pt Orbitron",'white');
		utilities.fillText(ctx,"P pauses, F turns off the star-field graphics (they can be a resource hog)",camera.width/10,10*camera.height/12,"10pt Orbitron",'white');
		utilities.fillText(ctx,"Play around for a bit, then press ENTER to start the game. Your goal is to destroy all enemy ships",camera.width/10,11*camera.height/12,"10pt Orbitron",'white');
		//this.fill
	},
};