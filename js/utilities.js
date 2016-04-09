// All of these functions are in the global scope
		
"use strict";

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
	return (to-from)*percent + from;
}

function clamp(min, value, max){
	return Math.max(min, Math.min(value, max))
}

// This gives Array a randomElement() method
Array.prototype.randomElement = function(){
	return this[Math.floor(Math.random() * this.length)];
}


