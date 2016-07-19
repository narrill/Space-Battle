// All of these functions are in the global scope
		
"use strict";

var gridFunctions = {
	//returns a random position within the given grid
	randomGridPosition:function(grid){
		var lower = [grid.gridStart[0],grid.gridStart[1]];
		var upper = [lower[0]+grid.gridLines*grid.gridSpacing,lower[1]+grid.gridLines*grid.gridSpacing];
		return {
			//position/rotation
			x: Math.random() * (upper[0] - lower[0]) + lower[0],
			y: Math.random() * (upper[1] - lower[1]) + lower[1]
		};
	},

	//returns a bool indicating whether the given position is within the given grid plus tolerances (in pixels)
	isPositionInGrid: function(position, grid, tolerances){
		if(!tolerances)
			tolerances = [0,0];
		var lower = [grid.gridStart[0],grid.gridStart[1]];
		var upper = [lower[0]+grid.gridLines*grid.gridSpacing,lower[1]+grid.gridLines*grid.gridSpacing];

		return position[0] > lower[0] - tolerances[0] && position[0] < upper[0] + tolerances[0] && position[1] > lower[1] - tolerances[1] && position[1] < upper[1] + tolerances[1];
	}
};

var utilities = {
	getForwardVector:function(obj){
		if(!obj.forwardVectorX || !obj.forwardVectorY)
		{
			var normalizedForwardVector = rotate(0,0,0,-1,-obj.rotation);
			obj.forwardVectorX = normalizedForwardVector[0],
			obj.forwardVectorY = normalizedForwardVector[1];
		}

		return [obj.forwardVectorX,obj.forwardVectorY];
	},

	getRightVector:function(obj){
		if(!obj.rightVectorX || !obj.rightVectorY)
		{
			var normalizedRightVector = rotate(0,0,0,-1,-obj.rotation+90);
			obj.rightVectorX = normalizedRightVector[0];
			obj.rightVectorY = normalizedRightVector[1];
		}

		return [obj.rightVectorX,obj.rightVectorY];
	},

	getMedialVelocity:function(obj){
		if(!obj.medialVelocity)
		{
			var forwardVector = utilities.getForwardVector(obj);
			obj.medialVelocity = -scalarComponentOf1InDirectionOf2(obj.velocityX,obj.velocityY,forwardVector[0],forwardVector[1]); //get magnitude of projection of velocity onto the forward vector
		}

		return obj.medialVelocity;
	},

	getLateralVelocity:function(obj){
		if(!obj.lateralVelocity){
			var rightVector = utilities.getRightVector(obj);
			obj.lateralVelocity = -scalarComponentOf1InDirectionOf2(obj.velocityX,obj.velocityY,rightVector[0],rightVector[1]); //et magnitude of velocity's projection onto the right vector
		}
		return obj.lateralVelocity;
	},
	fillText: function(ctx,string, x, y, css, color, alpha) {
		ctx.save();
		// https://developer.mozilla.org/en-US/docs/Web/CSS/font
		ctx.font = css;
		ctx.fillStyle = color;
		if(alpha)
			ctx.globalAlpha = alpha;
		ctx.fillText(string, x, y);
		ctx.restore();
	},	
	calculateDeltaTime: function(game){
		var now,fps;
		now = (Date.now().valueOf()); //get date as unix timestamp
		fps = 1000 / (now - game.lastTime);
		//fps = clamp(fps, 12, 60); //this literally makes this function useless for physics. just, why?
		game.lastTime = now; 
		return 1/fps;
	}
};

// returns mouse position in local coordinate system of element
function getMouse(e){
	var mouse = {} // make an object
	mouse.x = e.pageX - e.target.offsetLeft;
	mouse.y = e.pageY - e.target.offsetTop;
	return mouse;
}

function getRandom(min, max) {
  	return Math.random() * (max - min) + min;
}

function getRandomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


function makeColor(red, green, blue, alpha){
	var color='rgba('+red+','+green+','+blue+', '+alpha+')';
	return color;
}
function circlesIntersect(c1,c2){
	var dx = c2.x-c1.x;
	var dy = c2.y - c1.y;
	var distance = Math.sqrt(dx*dx+dy*dy);
	return distance<c1.radius+c2.radius;
}

// Function Name: getRandomColor()
// returns a random color of alpha 1.0
// http://paulirish.com/2009/random-hex-color-code-snippets/
function getRandomColor(){
	var red = Math.round(Math.random()*200+55);
	var green = Math.round(Math.random()*200+55);
	var blue=Math.round(Math.random()*200+55);
	var color='rgb('+red+','+green+','+blue+')';
	// OR	if you want to change alpha
	// var color='rgba('+red+','+green+','+blue+',0.50)'; // 0.50
	return color;
}

function getRandomBrightColor(){
	var h = Math.round(Math.random()*360);
	var color='hsl('+h+',100%,75%)';
	// OR	if you want to change alpha
	// var color='rgba('+red+','+green+','+blue+',0.50)'; // 0.50
	return color;
}

function pointInsideCircle(x, y, I) {
	var dx = x - I.x;
	var dy = y - I.y;
	return dx * dx + dy * dy <= I.radius * I.radius;
}

function getRandomUnitVector(){
	var x = getRandom(-1,1);
	var y = getRandom(-1,1);
	var length = Math.sqrt(x*x + y*y);
	if(length == 0){ // very unlikely
		x=1; // point right
		y=0;
		length = 1;
	} else{
		x /= length;
		y /= length;
	}
	
	return {x:x, y:y};
}

function simplePreload(imageArray){
	// loads images all at once
	for (var i = 0; i < imageArray.length; i++) {
		var img = new Image();
		img.src = imageArray[i];
	}
}


function loadImagesWithCallback(sources, callback) {
	var imageObjects = [];
	var numImages = sources.length;
	var numLoadedImages = 0;
	
	for (var i = 0; i < numImages; i++) {
	  imageObjects[i] = new Image();
	  imageObjects[i].onload = function() {
	  	numLoadedImages++;
	  	console.log("loaded image at '" + this.src + "'")
		if(numLoadedImages >= numImages) {
		  callback(imageObjects); // send the images back
		}
	  };
	  
	  imageObjects[i].src = sources[i];
	}
  }


/*
Function Name: clamp(val, min, max)
Author: Web - various sources
Return Value: the constrained value
Description: returns a value that is
constrained between min and max (inclusive) 
*/
function clamp(val, min, max){
	return Math.max(min, Math.min(max, val));
}


 // FULL SCREEN MODE
function requestFullscreen(element) {
	if (element.requestFullscreen) {
	  element.requestFullscreen();
	} else if (element.mozRequestFullscreen) {
	  element.mozRequestFullscreen();
	} else if (element.mozRequestFullScreen) { // camel-cased 'S' was changed to 's' in spec
	  element.mozRequestFullScreen();
	} else if (element.webkitRequestFullscreen) {
	  element.webkitRequestFullscreen();
	}
	// .. and do nothing if the method is not supported
};

//http://stackoverflow.com/questions/17410809/how-to-calculate-rotation-in-2d-in-javascript
//point to rotate around, point to rotate, angle to rotate by
function rotate(cx, cy, x, y, angle) {
    var radians = (Math.PI / 180) * angle,
        cos = Math.cos(radians),
        sin = Math.sin(radians),
        nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
        ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    return [nx, ny];
}

function dotProduct(x1,y1,x2,y2){
	return x1*x2+y1*y2;
}

function normalizeVector(x,y){
	var magnitude = Math.sqrt(x*x+y*y);
	return [x/magnitude,y/magnitude];
}

function vectorMagnitudeSqr(x,y){
	return x*x+y*y;
}

//broken
function componentOf1InDirectionOf2(x1,y1,x2,y2){
	if((x1==0 && y1==0) || (x2==0&&y2==0))
		return [0,0];
	var dot = x1*x2+y1*y2;
	var scalar = (dot * dot)/(x2*x2+y2*y2);
	return [scalar*x1,scalar*y1];
}

//projects vector 1 onto vector 2 and returns the magnitude of the projection
function scalarComponentOf1InDirectionOf2(x1,y1,x2,y2){
	if((x1==0 && y1==0) || (x2==0&&y2==0))
		return 0;
	//var dot = x1*x2+y1*y2;
	return (x1*x2+y1*y2)/Math.sqrt(x2*x2+y2*y2);
}

//converts given x,y from world space to camera space using the given camera
function worldPointToCameraSpace (xw,yw, camera){
	var cameraToPointVector = [(xw-camera.x)*camera.zoom,(yw-camera.y)*camera.zoom];
	var rotatedVector = rotate(0,0,cameraToPointVector[0],cameraToPointVector[1],camera.rotation);
	return [camera.width/2+rotatedVector[0],camera.height/2+rotatedVector[1]];
}

//http://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment
function distanceFromPointToLine(x, y, x1, y1, x2, y2) {

	var A = x - x1;
	var B = y - y1;
	var C = x2 - x1;
	var D = y2 - y1;

	var dot = A * C + B * D;
	var len_sq = C * C + D * D;
	var param = -1;
	if (len_sq != 0) //in case of 0 length line
	  param = dot / len_sq;

	var xx, yy;

	if (param < 0) {
	xx = x1;
	yy = y1;
	}
	else if (param > 1) {
	xx = x2;
	yy = y2;
	}
	else {
	xx = x1 + param * C;
	yy = y1 + param * D;
	}

	var dx = x - xx;
	var dy = y - yy;
	return [Math.sqrt(dx * dx + dy * dy),param];
}

function raySphereIntersect(s,e,c,r){
	var l = [c[0]-s[0],c[1]-s[1]];
	var startToEnd = [e[0]-s[0],e[1]-s[1]];
	var magnitude = Math.sqrt(startToEnd[0]*startToEnd[0]+startToEnd[1]*startToEnd[1]);
	var direction = [startToEnd[0]/magnitude,startToEnd[1]/magnitude];
	var tca = l[0]*direction[0]+l[1]*direction[1];
	if(tca<0)
		return false;
	var d = Math.sqrt((l[0]*l[0]+l[1]*l[1]) - (tca*tca));
	if(d<0)
		return false;
	var thc = Math.sqrt(r*r - d*d);
	return tca-thc;
}

function polygonCapsuleSAT(polygon, capsule)
{
	var axisCheck = polygonCapsuleAxisCheck;

	//loop through polygon verts and do axis checks
	for(var i = 0;i<polygon.length;i++){
		var nextPoint = (i==polygon.length-1) ? polygon[0] : polygon[i + 1];
		var normalAxis = [-(nextPoint[1] - polygon[i][1]), nextPoint[0] - polygon[i][0]]; //normal to axis between current point and next point
		var centerAxis1 = [capsule.center1[0] - polygon[i][0], capsule.center1[1] - polygon[i][1]]; //axis between current point and capsule center1
		var centerAxis2 = [capsule.center2[0] - polygon[i][0], capsule.center2[1] - polygon[i][1]]; //axis between current point and capsule center2
		if(!axisCheck(polygon, capsule, centerAxis1) || !axisCheck(polygon, capsule, centerAxis2))
			return false;
		else if(normalAxis == [0,0]) //don't check the normal if it's 0,0 - this can happen when vertices overlap
			continue;
		else if(!axisCheck(polygon, capsule, normalAxis))
			return false;
	}

	//get axis between centers, and the normal to that axis
	var capsuleAxisNormal = [-(capsule.center2[1] - capsule.center1[1]), capsule.center2[0] - capsule.center1[0]];
	var capsuleAxis = [capsule.center2[0] - capsule.center1[0], capsule.center2[1] - capsule.center1[1]];
	//check those as well
	if(!axisCheck(polygon, capsule, capsuleAxisNormal) || !axisCheck(polygon, capsule, capsuleAxis))
		return false;

	//if we made it this far there are no separating axes
	return true;
}

function polygonCapsuleAxisCheck(vertices, capsule, axis){
	var normalizedAxis = normalizeVector(axis[0], axis[1]);
	var max1;
	var min1;
	var maxCapsule;
	var minCapsule;
	//loop through verts. project onto the axis and find the min/max
	for (var c = 0; c < vertices.length; c++) {
		var vert = vertices[c];
		var projectedVert = vert[0]*normalizedAxis[0]+vert[1]*normalizedAxis[1];
		if (c == 0 || projectedVert > max1)
			max1 = projectedVert;
		if (c == 0 || projectedVert < min1)
			min1 = projectedVert;
	}
	//project capsule centers onto the axis
	var projectedCenters = [capsule.center1[0]*normalizedAxis[0] + capsule.center1[1]*normalizedAxis[1], capsule.center2[0]*normalizedAxis[0] + capsule.center2[1]*normalizedAxis[1]];
	//find min and max
	if(projectedCenters[0]>projectedCenters[1]){
		maxCapsule = projectedCenters[0];
		minCapsule = projectedCenters[1];
	}
	else{
		maxCapsule = projectedCenters[1];
		minCapsule = projectedCenters[0];
	}
	//it's a capsule, so add radius
	maxCapsule+=capsule.radius;
	minCapsule-=capsule.radius;

	//return bool indicating whether they overlap
	return !(max1 < minCapsule || maxCapsule < min1);
}

function capsuleCapsuleSAT(capsule1, capsule2){
	var axisCheck = capsuleCapsuleAxisCheck;

	//check first capsule's center axis
	var capsule1Axis = [capsule1.center2[0] - capsule1.center1[0], capsule1.center2[1] - capsule1.center1[1]];
	if(!axisCheck(capsule1, capsule2, capsule1Axis))
		return false;

	//check first capsule's normal axis
	var capsule1Normal = [-capsule1Axis[1], capsule1Axis[0]];
	if(!axisCheck(capsule1, capsule2, capsule1Normal))
		return false;

	//same for second capsule
	var capsule2Axis = [capsule2.center2[0] - capsule2.center1[0], capsule2.center2[1] - capsule2.center1[1]];
	if(!axisCheck(capsule1, capsule2, capsule2Axis))
		return false;

	var capsule2Normal = [-capsule2Axis[1], capsule2Axis[0]];
	if(!axisCheck(capsule1, capsule2, capsule2Normal))
		return false;

	return true;
}

function capsuleCapsuleAxisCheck(capsule1, capsule2, axis){
	var normalizedAxis = normalizeVector(axis[0], axis[1]);
	var maxCapsule1;
	var minCapsule1;
	var maxCapsule2;
	var minCapsule2;
	
	//project capsule1's centers onto the axis
	var projectedCenters1 = [capsule1.center1[0]*normalizedAxis[0] + capsule1.center1[1]*normalizedAxis[1], capsule1.center2[0]*normalizedAxis[0] + capsule1.center2[1]*normalizedAxis[1]];
	//find min and max
	if(projectedCenters1[0]>projectedCenters1[1]){
		maxCapsule1 = projectedCenters1[0];
		minCapsule1 = projectedCenters1[1];
	}
	else{
		maxCapsule1 = projectedCenters1[1];
		minCapsule1 = projectedCenters1[0];
	}
	//add radius, because capsule
	maxCapsule1+=capsule1.radius;
	minCapsule1-=capsule1.radius;
	
	//do the same for capsule2
	var projectedCenters2 = [capsule2.center1[0]*normalizedAxis[0] + capsule2.center1[1]*normalizedAxis[1], capsule2.center2[0]*normalizedAxis[0] + capsule2.center2[1]*normalizedAxis[1]];
	if(projectedCenters2[0]>projectedCenters2[1]){
		maxCapsule2 = projectedCenters2[0];
		minCapsule2 = projectedCenters2[1];
	}
	else{
		maxCapsule2 = projectedCenters2[1];
		minCapsule2 = projectedCenters2[0];
	}
	maxCapsule2+=capsule2.radius;
	minCapsule2-=capsule2.radius;

	//return whether they overlap
	return !(maxCapsule1 < minCapsule2 || maxCapsule2 < minCapsule1);
}

//http://stackoverflow.com/questions/9614109/how-to-calculate-an-angle-from-points
function angle(cx, cy, ex, ey) {
	var dy = ey - cy;
	var dx = ex - cx;
	var theta = Math.atan2(dy, dx); // range (-PI, PI]
	theta *= (180 / Math.PI); // rads to degs, range (-180, 180]
	theta+=180;
	return theta;
}

//http://blog.lexique-du-net.com/index.php?post/Calculate-the-real-difference-between-two-angles-keeping-the-sign
function differenceBetweenAngles(firstAngle, secondAngle){
	var difference = secondAngle - firstAngle;
	while (difference < -180) difference += 180;
	while (difference > 180) difference -= 180;
	return difference;
}

function angleBetweenVectors(x1,y1,x2,y2){
	var angle = (Math.atan2(y2, x2) - Math.atan2(y1, x1))*(180 / Math.PI);

	if(angle>180)
		angle-=360;
	else if(angle<-180)
		angle+=360;
	return angle;
}

function shadeRGBColor(color, percent) {
    var f=color.split(","),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=parseInt(f[0].slice(4)),G=parseInt(f[1]),B=parseInt(f[2]);
    return "rgb("+(Math.round((t-R)*p)+R)+","+(Math.round((t-G)*p)+G)+","+(Math.round((t-B)*p)+B)+")";
}

function lerp(from,to,percent){
	return (from * (1.0 - percent)) + (to * percent);
}

function lerp3d(from,to,percent){
	var x = (from[0] * (1.0 - percent)) + (to[0] * percent);
	var y = (from[1] * (1.0 - percent)) + (to[1] * percent);
	var z = (from[2] * (1.0 - percent)) + (to[2] * percent);
	return [x,y,z];
}

function lerpNd(from, to, percent){
	if(!Array.isArray(from))
		from = [from];
	if(!Array.isArray(to))
		to = [to];
	if(from.length!=to.length)
		return from;
	var returnVal = [];

	for(var c = 0;c<from.length;c++)
		returnVal.push((from[c] * (1.0 - percent)) + (to[c] * percent));

	return returnVal;
}

function clamp(min, value, max){
	return Math.max(min, Math.min(value, max))
}

// This gives Array a randomElement() method
Array.prototype.randomElement = function(){
	return this[Math.floor(Math.random() * this.length)];
}

function deepObjectMerge(target, src){
	if(!src)
		return target;
	//loop through source's attributes
	for(var key in src){
		//if the attribute is up the prototype chain, skip it
		if(!src.hasOwnProperty(key))
			continue;
		//if the current attribute is an object in the source
		if(src[key] instanceof Object && !(src[key] instanceof Array))
		{
			//if the current attribute isn't in the target, or isn't an object in the target
			if(!target[key] || !(target[key] instanceof Object && !(target[key] instanceof Array)))
				target[key] = {}; //make it an empty object
			//then deep merge the two
			deepObjectMerge(target[key],src[key]);
		}
		//if current attribute isn't an object in the source
		else
		{
			//if current attribute is an array in the source, give target a copy of it
			//target[key] = (Array.isArray(src[key])) ? src[key].slice() : src[key];

			//we'll worry about referencing bugs later
			target[key] = src[key];
		}
	}

	return target;
}

function veryShallowObjectMerge(target, src){
	if(!src)
		return target;
	//loop through source's attributes
	for(var key in src){
		//if the attribute is up the prototype chain, skip it
		if(!src.hasOwnProperty(key))
			continue;
		//if the current attribute is an object in the source
		if(src[key] instanceof Object && !(src[key] instanceof Array))
			continue;
		target[key] = src[key];
	}

	return target;
}

var mapFunctions = {
	worldToGridSpace:function(worldPos, map, gridPrecision){
		return [(worldPos[0]- map.position[0])/gridPrecision, (worldPos[1]- map.position[1])/gridPrecision];
	},
	gridToWorldSpace:function(gridPos, map, gridPrecision){
		return [(gridPos[0]*gridPrecision)+map.position]
	},
	/*worldPosTo1DGridIndex:function(worldPos, map, gridPrecision){
		var gridPos = [(worldPos[0]- map.position[0])/gridPrecision, (worldPos[1]- map.position[1])/gridPrecision];
		return Math.floor(gridPos[1]) * map.size
	},*/
	PosTo1DIndex:function(){
		
	}
};

var upVector = [0,1];
var downVector = [0,-1];
var rightVector = [1,0];
var leftVector = [-1,0];