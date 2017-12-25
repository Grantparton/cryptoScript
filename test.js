// Require packages
var express = require('express');
var path = require('path');
var request = require('request');
var fs = require('fs');
var app = express();
var port = 8000;
var gdax = require('gdax');
var clientBTC = new gdax.PublicClient('BTC-USD');
var clientETH = new gdax.PublicClient('ETH-USD');
var clientLTC = new gdax.PublicClient('LTC-USD');


// Data for timer, expressed in miliseconds
var iFrequency = 30000; 
var myInterval = 0;

// Global Variables for tracking ALL cryptotrade activity
var cash = 0;

//Global variables for individual currencies, from BTC -> ETH -> LTC
var listingPrice;
var temp;
var slope;
var btcQuantity = 0;
var associatedBuyin;
var buyReady;
var sellReady;
var oldSlope = 0;
var dipDetected;
var hillDetected;

var listingPriceE;
var tempE;
var slopeE;
var ethQuantity = 0;
var associatedBuyinE;
var buyReadyE;
var sellReadyE;
var oldSlopeE = 0;
var dipDetectedE;
var hillDetectedE;

var listingPriceL;
var tempL;
var slopeL;
var ltcQuantity = 0;
var associatedBuyinL;
var buyReadyL;
var sellReadyL;
var oldSlopeL = 0;
var dipDetectedL;
var hillDetectedL;

//Runn 24HrStats once for all three currencies to set base values
clientBTC.getProduct24HrStats((error, response, data) => {
	if(error) {
		console.log(error);
	}
	else {
		listingPrice = parseFloat(data.last);
		associatedBuyin = parseFloat(data.last);
		buyBTC(listingPrice);
	}
});

clientETH.getProduct24HrStats((error, response, data) => {
	if(error) {
		console.log(error);
	}
	else {
		listingPriceE = parseFloat(data.last);
		associatedBuyinE = parseFloat(data.last);
		buyETH(listingPriceE);
	}
});

clientLTC.getProduct24HrStats((error, response, data) => {
	if(error) {
		console.log(error);
	}
	else {
		listingPriceL = parseFloat(data.last);
		associatedBuyinL = parseFloat(data.last);
		buyLTC(listingPriceL);
	}
});

// STARTS and Resets the loop if any
function startLoop() {
    if(myInterval > 0) clearInterval(myInterval); 
    myInterval = setInterval(checkPrices, iFrequency);
}

function sellBTC(btcPrice) {
	var floatVersion = parseFloat(btcPrice);
	buyReady = true;
	sellReady = false;
	cash += btcQuantity * btcPrice - 1;
	console.log('		CASH MADE: ' + (btcQuantity * btcPrice  - 1));
	console.log('		TOTALCASH: ' + cash);
}

function sellETH(ethPrice) {
	var floatVersion = parseFloat(ethPrice);
	buyReadyE = true;
	sellReadyE = false;
	cash += ethQuantity * ethPrice - 1;
	console.log('		CASH MADE: ' + (ethQuantity * ethPrice - 1));
	console.log('		TOTALCASH: ' + cash);
}

function sellLTC(ltcPrice) {
	var floatVersion = parseFloat(ltcPrice);
	buyReadyL = true;
	sellReadyL = false;
	cash += ltcQuantity * ltcPrice - 1;
	console.log('		CASH MADE: ' + (ltcQuantity * ltcPrice - 1));
	console.log('		TOTALCASH: ' + cash);
}

function buyBTC(btcPrice) {
	var floatVersion = parseFloat(btcPrice);
	associatedBuyin = floatVersion;
	buyReady = false;
	sellReady = true;
	console.log('			Buying in BTC @ ' + btcPrice);
	btcQuantity = 1.0 / floatVersion;
}

function buyETH(ethPrice) {
	var floatVersion = parseFloat(ethPrice);
	associatedBuyinE = floatVersion;
	buyReadyE = false;
	sellReadyE = true;
	console.log('			Buying in ETH @ ' + ethPrice);
	ethQuantity = 1.0 / floatVersion;
}

function buyLTC(ltcPrice) {
	var floatVersion = parseFloat(ltcPrice);
	associatedBuyinL = floatVersion;
	buyReadyL = false;
	sellReadyL = true;
	console.log('			Buying in LTC @ ' + ltcPrice);
	ltcQuantity = 1.0 / floatVersion;
}

function determineSlope(listing, oldListing, oldestSlope) {
	var mySlope = (listing - oldListing) / (iFrequency / 1000);
	if(mySlope > 0 && oldestSlope < 0) {
		console.log('Detected a dip!');
		dipDetected = true;
	}
	else if (mySlope < 0 && oldestSlope > 0) {
		console.log('Detected a cresting hill!');
		hillDetected = true;
	}
	return mySlope;
}

function determineETHSlope(listing, oldListing, oldestSlope) {
	var mySlope = (listing - oldListing) / (iFrequency / 1000);
	if(mySlope > 0 && oldestSlope < 0) {
		console.log('Detected a dip!');
		dipDetectedE = true;
	}
	else if (mySlope < 0 && oldestSlope > 0) {
		console.log('Detected a cresting hill!');
		hillDetectedE = true;
	}
	return mySlope;
}

function determineLTCSlope(listing, oldListing, oldestSlope) {
	var mySlope = (listing - oldListing) / (iFrequency / 1000);
	if(mySlope > 0 && oldestSlope < 0) {
		console.log('Detected a dip!');
		dipDetectedL = true;
	}
	else if (mySlope < 0 && oldestSlope > 0) {
		console.log('Detected a cresting hill!');
		hillDetectedL = true;
	}
	return mySlope;
}

function probeBTC() {
	clientBTC.getProduct24HrStats((error, response, data) => {
		if(error) {
			console.log(error);
		}
		else {
			if(parseFloat(data.last) > listingPrice) {
				console.log(data.last + ': BTC UP');
				temp = listingPrice;
				listingPrice = parseFloat(data.last);
				slope = determineSlope(listingPrice, temp, oldSlope);
				console.log('BTC Slope is ' + slope);
				if(buyReady && dipDetected) {
					buyBTC(listingPrice);
					dipDetected = false;
				}
				oldSlope = slope;
			}
			else if(parseFloat(data.last) < listingPrice) {
				console.log(data.last + ': BTC DOWN');
				temp = listingPrice;
				listingPrice = parseFloat(data.last);
				slope = determineSlope(listingPrice, temp, oldSlope);
				console.log('BTC Slope is ' + slope);
				if(associatedBuyin < listingPrice && sellReady && hillDetected) {
					sellBTC(listingPrice);
					hillDetected = false;
				}
				oldSlope = slope;
			}
		}
	});
}

function probeETH() {
	clientETH.getProduct24HrStats((error, response, data) => {
		if(error) {
			console.log(error);
		}
		else {
			if(parseFloat(data.last) > listingPriceE) {
				console.log(data.last + ': ETH UP');
				tempE = listingPriceE;
				listingPriceE = parseFloat(data.last);
				slopeE = determineETHSlope(listingPriceE, tempE, oldSlopeE);
				console.log('ETH Slope is ' + slopeE);
				if(buyReadyE && dipDetectedE) {
					buyETH(listingPriceE);
					dipDetectedE = false;
				}
				oldSlopeE = slopeE;
			}
			else if(parseFloat(data.last) < listingPriceE) {
				console.log(data.last + ': ETH DOWN');
				tempE = listingPriceE;
				listingPriceE = parseFloat(data.last);
				slopeE = determineETHSlope(listingPriceE, tempE, oldSlopeE);
				console.log('ETH Slope is ' + slopeE);
				if(associatedBuyinE < listingPriceE && sellReadyE && hillDetectedE) {
					sellETH(listingPriceE);
					hillDetectedE = false;
				}
				oldSlopeE = slopeE;
			}
		}
	});
}

function probeLTC() {
	clientLTC.getProduct24HrStats((error, response, data) => {
		if(error) {
			console.log(error);
		}
		else {
			if(parseFloat(data.last) > listingPriceL) {
				console.log(data.last + ': LTC UP');
				tempL = listingPriceL;
				listingPriceL = parseFloat(data.last);
				slopeL = determineLTCSlope(listingPriceL, tempL, oldSlopeL);
				console.log('LTC Slope is ' + slopeL);
				if(buyReadyL && dipDetectedL) {
					buyLTC(listingPriceL);
					dipDetectedL = false;
				}
				oldSlopeL = slopeL;
			}
			else if(parseFloat(data.last) < listingPriceL) {
				console.log(data.last + ': LTC DOWN');
				tempL = listingPriceL;
				listingPriceL = parseFloat(data.last);
				slopeL = determineLTCSlope(listingPriceL, tempL, oldSlopeL);
				console.log('LTC Slope is ' + slopeL);
				if(associatedBuyinL < listingPriceL && sellReadyL && hillDetectedL) {
					sellLTC(listingPriceL);
					hillDetectedL = false;
				}
				oldSlopeL = slopeL;
			}
		}
	});
}

// Main function
function checkPrices()
{
	probeBTC();
	probeETH();
	probeLTC();
}

startLoop();

// Set up port to listen at 8000
app.listen(port);
console.log('Server is listening at port ' + port);