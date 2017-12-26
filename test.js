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

var ETHlistingPrice;
var ETHtemp;
var slopeE;
var ethQuantity = 0;
var ETHassociatedBuyin;
var ETHbuyReady;
var ETHsellReady;
var oldSlopeE = 0;
var ETHdipDetected;
var ETHhillDetected;

var LTClistingPrice;
var LTCtemp;
var slopeL;
var ltcQuantity = 0;
var LTCassociatedBuyin;
var LTCbuyReady;
var LTCsellReady;
var oldSlopeL = 0;
var LTCdipDetected;
var LTChillDetected;

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
		ETHlistingPrice = parseFloat(data.last);
		ETHassociatedBuyin = parseFloat(data.last);
		buyETH(ETHlistingPrice);
	}
});

clientLTC.getProduct24HrStats((error, response, data) => {
	if(error) {
		console.log(error);
	}
	else {
		LTClistingPrice = parseFloat(data.last);
		LTCassociatedBuyin = parseFloat(data.last);
		buyLTC(LTClistingPrice);
	}
});

/* The following three functions take an input of a given crypto price
   and sells it. We set buyReady and sellReady to true and false 
   respectively because once we sell, we are ready to buy, and also not 
   ready to sell again. We increment cash by our crypto quantity times 
   the current crypto price minus one, because we buy in at one dollar 
   every iteration. */
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
	ETHbuyReady = true;
	ETHsellReady = false;
	cash += ethQuantity * ethPrice - 1;
	console.log('		CASH MADE: ' + (ethQuantity * ethPrice - 1));
	console.log('		TOTALCASH: ' + cash);
}

function sellLTC(ltcPrice) {
	var floatVersion = parseFloat(ltcPrice);
	LTCbuyReady = true;
	LTCsellReady = false;
	cash += ltcQuantity * ltcPrice - 1;
	console.log('		CASH MADE: ' + (ltcQuantity * ltcPrice - 1));
	console.log('		TOTALCASH: ' + cash);
}

/* The following three functions take an input of a given crypto price
   and buys one dollar's worth. We set the associatedBuyin to the current
   price, for later use because we dont want to sell unless the new "sell"
   price is more than the associated original buyin price. We then set 
   appropriate buyReady/sellReady values to indicate that we've purchased 
   and set our quantity to 1 / price, because we only buy one dollars 
   worth. */
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
	ETHassociatedBuyin = floatVersion;
	ETHbuyReady = false;
	ETHsellReady = true;
	console.log('			Buying in ETH @ ' + ethPrice);
	ethQuantity = 1.0 / floatVersion;
}

function buyLTC(ltcPrice) {
	var floatVersion = parseFloat(ltcPrice);
	LTCassociatedBuyin = floatVersion;
	LTCbuyReady = false;
	LTCsellReady = true;
	console.log('			Buying in LTC @ ' + ltcPrice);
	ltcQuantity = 1.0 / floatVersion;
}


/* The following three functions simply determine the slope of the 
   prices, based on the last read. We use the old slope value to determine
   if we've hit a dip or hill, which could indicate a sell condition. */
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
		ETHdipDetected = true;
	}
	else if (mySlope < 0 && oldestSlope > 0) {
		console.log('Detected a cresting hill!');
		ETHhillDetected = true;
	}
	return mySlope;
}

function determineLTCSlope(listing, oldListing, oldestSlope) {
	var mySlope = (listing - oldListing) / (iFrequency / 1000);
	if(mySlope > 0 && oldestSlope < 0) {
		console.log('Detected a dip!');
		LTCdipDetected = true;
	}
	else if (mySlope < 0 && oldestSlope > 0) {
		console.log('Detected a cresting hill!');
		LTChillDetected = true;
	}
	return mySlope;
}

/* The following three functions actually probe each cryptotype, and make
   the call as to whether we should buy or sell. */
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
			if(parseFloat(data.last) > ETHlistingPrice) {
				console.log(data.last + ': ETH UP');
				ETHtemp = ETHlistingPrice;
				ETHlistingPrice = parseFloat(data.last);
				slopeE = determineETHSlope(ETHlistingPrice, ETHtemp, oldSlopeE);
				console.log('ETH Slope is ' + slopeE);
				if(ETHbuyReady && ETHdipDetected) {
					buyETH(ETHlistingPrice);
					ETHdipDetected = false;
				}
				oldSlopeE = slopeE;
			}
			else if(parseFloat(data.last) < ETHlistingPrice) {
				console.log(data.last + ': ETH DOWN');
				ETHtemp = ETHlistingPrice;
				ETHlistingPrice = parseFloat(data.last);
				slopeE = determineETHSlope(ETHlistingPrice, ETHtemp, oldSlopeE);
				console.log('ETH Slope is ' + slopeE);
				if(ETHassociatedBuyin < ETHlistingPrice && ETHsellReady && ETHhillDetected) {
					sellETH(ETHlistingPrice);
					ETHhillDetected = false;
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
			if(parseFloat(data.last) > LTClistingPrice) {
				console.log(data.last + ': LTC UP');
				LTCtemp = LTClistingPrice;
				LTClistingPrice = parseFloat(data.last);
				slopeL = determineLTCSlope(LTClistingPrice, LTCtemp, oldSlopeL);
				console.log('LTC Slope is ' + slopeL);
				if(LTCbuyReady && LTCdipDetected) {
					buyLTC(LTClistingPrice);
					LTCdipDetected = false;
				}
				oldSlopeL = slopeL;
			}
			else if(parseFloat(data.last) < LTClistingPrice) {
				console.log(data.last + ': LTC DOWN');
				LTCtemp = LTClistingPrice;
				LTClistingPrice = parseFloat(data.last);
				slopeL = determineLTCSlope(LTClistingPrice, LTCtemp, oldSlopeL);
				console.log('LTC Slope is ' + slopeL);
				if(LTCassociatedBuyin < LTClistingPrice && LTCsellReady && LTChillDetected) {
					sellLTC(LTClistingPrice);
					LTChillDetected = false;
				}
				oldSlopeL = slopeL;
			}
		}
	});
}

// Starts and resets the loop that pulls data
function startLoop() {
    if(myInterval > 0) clearInterval(myInterval); 
    myInterval = setInterval(checkPrices, iFrequency);
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