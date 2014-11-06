var xal = require('../../xal-javascript');
var _ = require('underscore');

var lastDestinationAgent = null;
var lastDestinationCertainty = 0.0;

function mostProbable(values) {
    return _.reduce(values, function(memo, value) {
        if (value.certainty > memo.certainty) {
            memo = value;
        }
        return memo;
    });
}

function mostProbableOther(values) {
    return _.reduce(values, function(memo, value) {
        if (memo === null && value.source !== xal.getId()) {
            return value;
        }
        if (value.source !== xal.getId() && value.certainty > memo.certainty) {
            memo = value;
        }
        return memo;
    }, null);
}

xal.on('xi.event.input.destination', function(state, next) {

    var id = state.get('xi.event.id');

    // try to finalize destination based on agent proposals
    var destinations = state.get('xi.event.input.destination');
    if (destinations) {
        var mpd = mostProbableOther(destinations);
        if (mpd) {
            state.put('xi.event.input.destination', {value: mpd.value, certainty: mpd.certainty});
            lastDestinationAgent = mpd.value;
            lastDestinationCertainty = mpd.certainty;
        }
    }
    next(state);
});

xal.on('xi.event.output', function(state, next) {
    // TODO: Handle different kinds of output
    output = mostProbable(state.get('xi.event.output.text'));
    if (output) {
        lastDestinationAgent = output.source;
        lastDestinationCertainty = output.certainty;
        xal.log.info({lastDestinationAgent: lastDestinationAgent,
                      lastDestinationCertainty: lastDestinationCertainty},
                     "Updated last agent based on output");
    }
});

// Send input events to the agent that we last set,
// by default. Later, this first guess may be changed.
// This is to have a 'conversation' like behavior.

xal.on('xi.event.input', function(state, next) {
    var destinations = state.get('xi.event.input.destination');
    if (!destinations && lastDestinationAgent && lastDestinationCertainty > 0) {
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

// setInterval(decayCertainty, 10 * 1000);

xal.start({name: 'InputManager'});
