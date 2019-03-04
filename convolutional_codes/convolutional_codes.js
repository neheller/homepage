// Nicholas Heller, 2018
//
// Naive js implementation of convolutional encoding and decoding with the
// Viterbi algorithm


function evaluate(bvs, plys) {
    var ret = new Array(plys.length);
    var i;
    var j;
    for (i = 0; i < ret.length; i++) {
        ret[i] = 0;
        for (j = 0; j < plys[i].length; j++) {
            ret[i] = ret[i] + plys[i][j]*bvs[j];
        }
        ret[i] = ret[i]%2;
    }
    return ret;
}


function get_transition(bit_vals, polys) {
    var i = 0;
    var base_val = 0;
    for (i = polys[0].length-1; i > 0; i--) {
        base_val = base_val + bit_vals[i]*Math.pow(
            2, polys[0].length - i
        );
    }
    return base_val;
}


function get_states(polys) {
    var inverse_rate = polys.length;
    var constraint_length = polys[0].length;
    var states = new Array(Math.pow(2, constraint_length));
    var i;
    var j;
    for (i = 0; i < states.length; i++) {
        bit_vals = new Array(constraint_length);
        for (j = 0; j < bit_vals.length; j++) {
            mask = 1 << bit_vals.length - j - 1;
            bitval = 0;
            if ((i & mask) != 0) {bitval = 1;}
            bit_vals[j] = bitval;
        }
        states[i] = {
            "msgvals": evaluate(bit_vals, polys),
            "bstvals": bit_vals,
            "transition": get_transition(bit_vals, polys),
            "bstcmp": i
        }
    }
    return states;
}


function conv_encode(bitstring, polys, channel_error, callback, when_finished) {
    var i = 0;
    var ii = 0;
    var j;
    var k;
    var rnd;
    var num_errors = 0;
    var num_correct = 0;
    var constraint_length = polys[0].length;
    var inverse_rate = polys.length;
    var encoded_message = new Array(
        polys.length*(bitstring.length - constraint_length)
    );
    var start = new Date() / 1000;
    var seconds;
    var states = get_states(polys);
    var cur_state = states[0];
    function f() {
        while (ii < i + Math.ceil(bitstring.length/100) && (ii < bitstring.length - constraint_length + 1)) {
            nsind = cur_state["transition"] + bitstring[ii+constraint_length-1];
            cur_state = states[nsind];
            for (j = 0; j < polys.length; j++) {
                encoded_message[ii*inverse_rate+j] = cur_state["msgvals"][j]
                rnd = 0;
                if (Math.random() < channel_error) {rnd = 1;num_errors++;}
                else {num_correct++;}
                encoded_message[ii+j] = (encoded_message[ii+j] + rnd)%2;
            }
            ii++;
        }
        i = i + Math.ceil(bitstring.length/100);
        seconds = new Date() / 1000;
        callback(
            num_errors, num_correct, seconds - start, 
            j*(bitstring.length-constraint_length)
        );
        if (i < bitstring.length - polys[0].length) {setTimeout(f, 1);}
        else {when_finished(encoded_message);}
    }
    f();
}

function get_num_errors(arr1, arr2) {
    var acc = 0;
    var i;
    for (i = 0; i < arr2.length; i++) {
        if (arr1[i] != arr2[i]) {acc++;}
    }
    return acc;
}

function generate_candidates(paths, states, received_block) {
    var i;
    var pre_length = paths.length;
    var prev_state;
    for (i = 0; i < pre_length; i++) {
        prev_state = paths[i]["state_list"][paths[i]["state_list"].length-1];
        // Make a new path for the 1 trajectory
        new_state_1 = states[prev_state["transition"] + 1];
        // Deep copy
        paths.push(JSON.parse(JSON.stringify(paths[i])));
        paths[paths.length-1]["state_list"].push(new_state_1);
        paths[paths.length-1]["errors"] += get_num_errors(
            received_block, new_state_1["msgvals"]
        )
        // Just append the 0 trajectory to the current path
        new_state_0 = states[prev_state["transition"]];
        paths[i]["state_list"].push(new_state_0);
        paths[i]["errors"] += get_num_errors(
            received_block, new_state_0["msgvals"]
        )
    }
}

function prune_candidates(paths, states) {
    // Initialize list with no candidates in each state
    var candidates_by_state = new Array(states.length);
    for (var i = 0; i < states.length; i++) {
        candidates_by_state[i] = new Array();
    }
    var path_length = paths[0]["state_list"].length;
    // For each path, add it to the list corresponding to its current state
    for (var i = 0; i < paths.length; i++) {
        candidates_by_state[paths[i]["state_list"][path_length-1]["bstcmp"]].push(
            paths[i]
        );
    }
    // Prune each state list
    var pruned_paths = new Array();
    var min_ind;
    var min_err;
    for (var i = 0; i < states.length; i++) {
        min_ind = -1;
        min_err = Number.MAX_SAFE_INTEGER;
        for (var j = 0; j < candidates_by_state[i].length; j++) {
            err = candidates_by_state[i][j]["errors"];
            if (err < min_err) {min_ind = j; min_err = err;}
        }
        if (min_ind >= 0) {
            pruned_paths.push(
                JSON.parse(JSON.stringify(candidates_by_state[i][min_ind]))
            );
        }
    }
    return pruned_paths;
}

function viterbi_decode(message, polys, bitstring, callback, when_finished) {
    var i = 0;
    var ii = 0;
    var j;
    var k;
    var rnd;
    var num_errors = 0;
    num_correct = 0;
    var constraint_length = polys[0].length;
    var inverse_rate = polys.length;
    var decoded_message = new Array(bitstring.length);
    var transition_errors = new Array(constraint_length);
    for (i = 0; i < constraint_length; i++) {
        transition_errors[i] = new Array(bitstring.length);
    }
    i = 0;
    var start = new Date() / 1000;
    var seconds;
    var states = get_states(polys);
    var base_state = states[0];
    var base_position = ii - 5*constraint_length;
    // Define paths as a collection of arrays of states, plus current error
    var paths = [
        {
            "state_list": [base_state], 
            "errors": 0
        }
    ]
    var received_block = new Array(inverse_rate);
    function f() {
        block_size = Math.min(message.length/100, 50);
        while (ii < i + block_size && (ii < message.length + 5*constraint_length)) {
            base_position = Math.floor(ii/inverse_rate) - 5*constraint_length;
            if (ii < message.length) {
                // Keep accruing errors
                for(j = 0; j < inverse_rate; j++) {
                    received_block[j] = message[ii+j];
                }
                // We will now generate candidate paths. There should be two
                // for every path we have now
                // We will have 2 times the previous number of paths as 
                // candidates, corresponding to the next observed bit being 1
                // or being 0.
                generate_candidates(paths, states, received_block);
                // We now prune paths that land us on the same state, but 
                // require more errors to get there, meaning they will
                // definitely not be the most likely
                paths = prune_candidates(paths, states);
                // This pruning ensures that the number of paths we're 
                // considering never exceeds 2^K where K is the constraint
                // length
            }
            ii = ii + inverse_rate;
        }
        i = i + block_size;
        seconds = new Date() / 1000;
        callback(
            num_errors, num_correct, seconds - start, 
            j*(bitstring.length-constraint_length)
        );
        if (i < message.length) {setTimeout(f, 1);}
        else {when_finished(paths, start);}
    }
    f();
}


function get_polynomials(constraint_length, inverse_rate, polys) {
    // If they were given, return them unchanged
    if (polys != null) {return polys;}
    // Else select from list based on params
    return polysets[constraint_length-3][inverse_rate-2];
}


function get_padded_bitstring(constraint_length, num_bits) {
    var i;
    var bitstring = new Array(num_bits + constraint_length - 1);
    for (i = 0; i < constraint_length - 1; i++) {
        bitstring[i] = 0;
    }
    for (i = constraint_length - 1; i < num_bits + constraint_length - 1; i++) {
        bitstring[i] = Math.round(Math.random());
    }
    return bitstring;
}


function encode_decode(
    num_bits, constraint_length, inverse_rate, channel_error, 
    encoding_callback, decoding_callback, polys
) {
    // Instantiate the visualization to the first state
    encoding_callback(0, 0, 0, num_bits);
    decoding_callback(0, 0, 0, num_bits);

    // Select polynomials to use for encoding
    var polynomials = get_polynomials(constraint_length, inverse_rate, polys);
    // Get a bitstring to encode
    var bitstring = get_padded_bitstring(constraint_length, num_bits);

    function choose_best_path(paths, start) {
        var best_state_list;
        var min_ind = -1;
        var min_err = Number.MAX_SAFE_INTEGER;
        var num_uncorrectable = 0;
        for (var i = 0; i < paths.length; i++) {
            if (paths[i]["errors"] < min_err) {min_ind = i; min_err = paths[i]["errors"];}
        }
        best_state_list = paths[min_ind]["state_list"];
        var decoded_message = new Array(bitstring.length);
        var num_errors = 0;
        var num_correct = 0;
        for (var i = 0; i < best_state_list.length-1; i++) {
            decoded_message[i] = best_state_list[i+1]["bstvals"][constraint_length-1];
            if (decoded_message[i] != bitstring[i+constraint_length-1]) {num_errors++;}
            else {num_correct++;}
        }
        seconds = new Date() / 1000;
        decoding_callback(num_errors, num_correct, seconds - start, num_bits);
    }

    function decode_when_encoded(message) {
        viterbi_decode(
            message, polynomials, bitstring, decoding_callback, 
            choose_best_path
        );
    }
    
    // Encode the message
    conv_encode(
        bitstring, polynomials, channel_error, encoding_callback,
        decode_when_encoded
    );
}
