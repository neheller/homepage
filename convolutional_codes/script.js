/* Functionality for Sliding Window Demo */

// This function adapted from stackoverflow answer: 
// https://stackoverflow.com/a/17268489
function get_hsl_color(p, a){
    var hue=((1 - p)*255).toString(10);
    return ["hsla(", hue, ", 80%, 50%,", a, ")"].join("");
}

function color_window(cell_cont) {
    var i;
    var cells = $(cell_cont).children();
    for (i = 0; i < cells.length; i++) {
        $(cells[i]).css(
            "border-color", get_hsl_color(i/(cells.length-1), 1.0)
        )
        $(cells[i]).css(
            "background-color", get_hsl_color(i/(cells.length-1), 0.2)
        )
    }
    return cells;
}
function color_equation(eqn_cont, num_cells) {
    var i;
    var param;
    for (i = 0; i < num_cells; i++) {
        param = $(eqn_cont).find($(["span.eqn_c", i].join("")))[0]
        $($(param)[0]).css(
            "color", get_hsl_color(i/(num_cells-1), 1.0)
        )
    }
}
function color_equations(eqn_cont, num_cells) {
    var i;
    var eqns = $([eqn_cont.selector, "div.eqn"].join(" "));
    for (i = 0; i < eqns.length; i++) {
        color_equation(eqns[i], num_cells);
    }
}


function set_sw_polynomials(bits, num_cells, j) {
    var i;
    var bitval;
    var paramval;
    var eqn_acc;
    var eqns = $("div#sw_encoding div.eqn");
    var k;
    var plc;
    var message_obj = "div#sw_encoding div.encoded_cont span.message";
    for (k = 0; k < eqns.length; k++) {
        eqn_acc = 0;
        for (i = j; i < j + num_cells; i++) {
            bitval = $(bits[i]).text();
            plc = $(eqns[k]).find(["span.eqn_c", i-j].join(""));
            paramval = $(plc).prev("span").text();
            $(plc).html(bitval);
            eqn_acc = eqn_acc + parseInt(bitval)*parseInt(paramval);
        }
        $(eqns[k]).find("span.answer").html(eqn_acc%2);
        $(message_obj).html([$(message_obj).text(), eqn_acc%2].join(""))
    }
}

function run_sw_encode(cells) {
    var wdw = "div#sw_encoding div.window"
    var bts = "div#sw_encoding div.bitstring"
    var bits = $(bts).children();
    var j = 0;
    set_sw_polynomials(bits, cells.length, j);
    function f() {
        // Timing for animation/loop
        j = j + 1;
        if (j > bits.length - cells.length) {
            j = 0;
            $("div#sw_encoding div.encoded_cont span.message").html("");
        }
        // Actual changes on screen
        $(wdw).css("left", [j*32, "px"].join(""));
        set_sw_polynomials(bits, cells.length, j);
        setTimeout(f, 1500);
    }
    setTimeout(f, 1500);
}

/* Functionality for Tuning Parameters Demo */
function set_probability() {
    p = $("input#tun_p").val();
    $("span#tun_p_val").html((p/1000).toFixed(2));
}

function format_time(seconds) {
    // Please tell me there's a better way to format strings in js
    var sec = Math.floor(seconds%60);
    if (sec < 10) {
        sec = ["0", sec].join("");
    }
    return [Math.floor(seconds/60), sec].join(":");
}

function format_percentage(prop) {
    var percentage = (prop*100).toFixed(1);
    return [percentage, "%"].join("");
}

function encoding_callback(num_err, num_cor, seconds_elapsed, num_bits) {
    $("#viz_encode span.tns_time").html(format_time(seconds_elapsed));
    $("#viz_encode span.tns_err").html(
        format_percentage(num_err/(num_cor+num_err+0.001))
    );
    var cor_prop = Math.ceil(100*num_cor/num_bits);
    $("#enc_cor").css("width", [cor_prop, "%"].join(""));
    $("#enc_err").css("width", [100-cor_prop, "%"].join(""));
}

function decoding_callback(num_err, num_cor, seconds_elapsed, num_bits) {
    $("#viz_decode span.tns_time").html(format_time(seconds_elapsed));
    $("#viz_decode span.tns_err").html(
        format_percentage(num_err/(num_cor+num_err+0.001))
    );
    var cor_prop = Math.ceil(100*num_cor/num_bits);
    $("#dec_cor").css("width", [cor_prop, "%"].join(""));
    $("#dec_err").css("width", [100-cor_prop, "%"].join(""));
}

function initiate_encode_decode(num_bits) {
    var constraint_length = parseInt(
        $("div#tuning div#constraint_length_selection a.sel").text()
    );
    var inverse_rate = parseInt(
        $("div#tuning div#inverse_rate_selection a.sel").text()
    );
    var channel_error = $("div#tuning input").val()/1000;
    encode_decode(
        num_bits, constraint_length, inverse_rate, 
        channel_error, encoding_callback, decoding_callback, null
    );
}


// Declare listeners for menu selections
function declare_tuning_listeners() {
    $("div#tuning div#constraint_length_selection a.menu_button").click(
        function(e) {
            e.preventDefault();
            $("div#tuning div#constraint_length_selection a.sel").removeClass(
                "sel"
            );
            $(this).addClass("sel");
        }
    );
    $("div#tuning div#inverse_rate_selection a.menu_button").click(
        function(e) {
            e.preventDefault();
            $("div#tuning div#inverse_rate_selection a.sel").removeClass(
                "sel"
            );
            $(this).addClass("sel");
        }
    );
    $("a#transfer_url").click(function(e) {
        e.preventDefault();
        initiate_encode_decode(80);
    });
    $("a#transfer_lyrics").click(function(e) {
        e.preventDefault();
        initiate_encode_decode(352);
    });
    $("a#transfer_image").click(function(e) {
        e.preventDefault();
        initiate_encode_decode(1000);
    });
    $("a#transfer_song").click(function(e) {
        e.preventDefault();
        initiate_encode_decode(40737064);
    });
}

/* Functionality for the polynomial tuning */

function pencoding_callback(num_err, num_cor, seconds_elapsed, num_bits) {
    $("#pviz_encode span.tns_time").html(format_time(seconds_elapsed));
    $("#pviz_encode span.tns_err").html(
        format_percentage(num_err/(num_cor+num_err+0.001))
    );
    var cor_prop = Math.ceil(100*num_cor/num_bits);
    $("#penc_cor").css("width", [cor_prop, "%"].join(""));
    $("#penc_err").css("width", [100-cor_prop, "%"].join(""));
}

function pdecoding_callback(num_err, num_cor, seconds_elapsed, num_bits) {
    $("#pviz_decode span.tns_time").html(format_time(seconds_elapsed));
    $("#pviz_decode span.tns_err").html(
        format_percentage(num_err/(num_cor+num_err+0.001))
    );
    var cor_prop = Math.ceil(100*num_cor/num_bits);
    $("#pdec_cor").css("width", [cor_prop, "%"].join(""));
    $("#pdec_err").css("width", [100-cor_prop, "%"].join(""));
}

function pset_probability() {
    var p = $("input#ptun_p").val();
    $("span#ptun_p_val").html((p/1000).toFixed(2));
}

function declare_poly_listeners() {
    $("a#ptransfer_url").click(function(e) {
        e.preventDefault();
        // Get the values of the polynomials and the channel error
        var selected_polys = [
            [1,1,1,1,1],
            [1,0,1,0,1],
            [0,1,0,1,0]
        ]
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 5; j++) {
                selected_polys[i][j] = parseInt(
                    $([
                        "a#polybit_", i, j
                    ].join("")).text()
                )
            }
        }
        console.log(selected_polys);
        // TODO
        var channel_error = $("input#ptun_p").val()/1000;
        console.log($("input#ptun_p").val())
        // Start encoding and decoding process
        encode_decode(
            352, 5, 3, channel_error, pencoding_callback, pdecoding_callback, 
            selected_polys
        );
    });
    $("a.bit").click(function(e) {
        e.preventDefault();
        $(this).html((parseInt($(this).text())+1)%2);
    });
}



/* Run on page load */
$(document).ready(function() {
    // Sliding Window Animation
    var cells = color_window("div#sw_encoding div.window div.cells");
    color_equations("div#sw_encoding", cells.length);
    run_sw_encode(cells);
    set_probability();
    declare_tuning_listeners();
    declare_poly_listeners();
    pset_probability();
});