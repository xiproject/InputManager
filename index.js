var xal = require('../../xal-javascript');
var _ = require('underscore');

var mostProbableDestinations = {};

var lastDestinationAgent = null;
var lastDestinationCertainty = 1.0;

function finalizeIfNecessary(id, oldValue, certainty) {
    return function() {
        if (mostProbableDestinations[id] &&
            mostProbableDestinations[id] === oldValue) {
            xal.log.info({id: id, value: oldValue}, 'finalizing destination for event');
            xal.updateEvent(id, 'xi.event.input.destination', {value: oldValue, certainty: 1.0});
            lastDestinationAgent =  oldValue;
            lastDestinationCertainty = certainty || 1.0;
        }
    };
}

xal.on('xi.event.input.destination', function(state, next) {
    var destinations = state.get('xi.event.input.destination');
    var id = state.get('xi.event.id');
    var mpd = _.reduce(destinations, function(memo, dest) {
        if (dest.certainty > memo.certainty) {
            memo = dest;
        }
        return memo;
    });
    if (mpd) {
        mostProbableDestinations[id] = mpd.value;
        setTimeout(finalizeIfNecessary(id, mpd.value, mpd.certainty), 1000);
    } else {
        delete mostProbableDestinations[id];
    }
    next(state);
});

// Send input events to the agent that we last set,
// by default. Later, this first guess may be changed.
// This is to have a 'conversation' like behavior.

xal.on('xi.event.input', function(state, next) {
    if (lastOutputAgent && lastDestinationCertainty > 0) {
        state.put('xi.event.input.destination', {
            value: lastDestinationAgent,
            certainty: lastDestinationCertainty
        });
    }
    next(state);
});

// Decay certainty about sending new inputs to the last
// destination.

function decayCertainty() {
    if (lastDestinationCertainty > 0) {
        lastDestinationCertainty -= 0.1;
    } else {
        lastDestinationCertainty = 0;
    }
}

setInterval(decayCertainty, 5000);

xal.start({name: 'InputManager'});
