/**
 * Color Parsing
 */

var utils = utils || {};

utils.video = {
    parseColor: function (color, toNumber) {
        if (toNumber === true) {
            if (typeof color === 'number') {
                return (color | 0); // chop off decimal
            }
            if (typeof color === 'string' && color[0] === '#') {
                color = color.slice(1);
            }
            return parseInt(color, 16);
        } else {
            if (typeof color === 'number') {
                // make sure our hexidecimal number is padded out
                color = '#' + ('00000' + (color | 0).toString(16)).substr(-6);
            }
            return color;
        }
    },
    /**
     * @param {Array} color Is a triplet of RGB
     * @param {String} method can be 'lightness', 'average', 'luminosity'
     * @link http://www.johndcook.com/blog/2009/08/24/algorithms-convert-color-grayscale/
     */
    colorToGrayscale: function (color, method, params) {
        /* color is described by RGB
        1. lightness method (GIMP) averages the most prominent and least prominent colors (max(R,G,B) + min(R,G,B)) / 2
        2. average method simply averages the values (R + G + B) / 3
        3. luminosity method is a more sophisticated version of the average method
        forms weighted average to account for human perception
        we are more sensitive to green than other colors, so green is weighted heavily
        formula 0.21 R + 0.71 G + 0.07 B
        */
        var alpha = 1,
            color, // red
            method = (method === undefined) ? 'lightness' : method,
            value;

        if (color.length > 3) {
            alpha = color.pop(); // pull last index
        }

        function lightness() {
            var min = 0, 
                max = 0,
                i = 0,
                result;

            for (; i < color.length; i++) {
                if (color[i] > max) { max = color[i]}
                if (color[i] < min) { min = color[i]}
            }
            result = Math.floor((max + min) / 2); 
            return [result,result,result];
        };

        function average() {
            var i = 0,
                total = 0,
                result;
            for (; i < color.length; i++) {
                total += color[i];
            }
            result = Math.floor(total / 3);
            return [result, result, result];
        };

        function luminosity() {
            var i = 0,
                weighted_total = 0,
                total = 0,
                weights = [0.21,0.71,0.07],
                result;
            // [(w1*n1) + (w2*n2) + (w3*n3)] / (w1 + w2 + w3)
            for (; i < color.length; i++){
                weighted_total += (weights[i] * color[i]);
                total += weights[i];
            }
            result = Math.floor(weighted_total / total);
            return [result,result,result];
        };

        switch (method) {
            case "lightness":
                return [lightness(), alpha]; // grayscale, alpha
                break;

            case "average":
                return [average(), alpha];
                break;

            case "luminosity":
                return [luminosity(), alpha];
                break;
        }
    },
    colorToInverse: function (color, method, params) {
        var alpha = 1,
            color, // red
            method = (method === undefined) ? '' : method,
            value;
        if (color.length > 3) {
            alpha = color.pop(); // pull last index
        }

        function invert() {
            var i = 0,
                l = color.length,
                resample = new Array(3);
            for (; i < l; i++) {
                resample[i] = 255 - color[i];
            }
            return resample;
        };
        return [invert(),alpha];
    },
    /**
     * RGB to XRay
     * 
     * @param {array} color is the rgba array
     * @param [string] method Is the type of sepia transform to produce
     * @notes
      outputRed = (inputRed * .393) + (inputGreen *.769) + (inputBlue * .189)
      outputGreen = (inputRed * .349) + (inputGreen *.686) + (inputBlue * .168)
      outputBlue = (inputRed * .272) + (inputGreen *.534) + (inputBlue * .131)
     */
    colorToXRay: function (color, method, params) {
        var oRed = 0, 
            oGreen = 0, 
            oBlue = 0,
            cTrans = [[0.393,0.769,0.189],[0.349,0.686,0.168],[0.272,0.534,0.131]], 
            //cTrans = [0.299, 0.587, 0.114],
            i = 0,
            alpha;

        // free up alpha
        if (color.length > 3) { alpha = color.pop();}

        // loop through rgb
        for (; i < color.length; i++) {
            // build oRed, oBlue, oGreen
            oRed += (color[0] * cTrans[i][0]); // 255 * 0.393, 255 * 0.349...
            oGreen += (color[1] * cTrans[i][1]); // 156 * 0.769, 156 * 0.686...
            oBlue += (color[2] * cTrans[i][2]); // 5 * 0.189, 5 * 0.168...
        }
        oRed *= 0.393;
        oGreen *= 0.892;
        oBlue *= 0.078;
        // reset to 255 if value is greater than 255
        oRed = (oRed > 255) ? 255 : Math.floor(oRed);
        oGreen = (oGreen > 255) ? 255 : Math.floor(oGreen);
        oBlue = (oBlue > 255) ? 255 : Math.floor(oBlue);

        return [oRed,oGreen,oBlue,alpha];
    },

    colorToSepia: function (color, method, params) {
        
        var oRed = 0, 
            oGreen = 0, 
            oBlue = 0,
            cTrans = [[0.393,0.769,0.189],[0.349,0.686,0.168],[0.272,0.534,0.131]],
            i = 0,
            gray = 0,
            alpha;

        params = {
            offsetRed: 0.769,
            offsetGreen: 0.323,
            negativeBlue: 20
        }

        // free up alpha
        if (color.length > 3) { alpha = color.pop();}

        function luminosity() {
            var i = 0,
                weighted_total = 0,
                total = 0,
                weights = [0.21,0.71,0.07],
                result;
            // [(w1*n1) + (w2*n2) + (w3*n3)] / (w1 + w2 + w3)
            for (; i < color.length; i++){
                weighted_total += (weights[i] * color[i]);
                total += weights[i];
            }
            result = Math.floor(weighted_total / total);
            return [result,result,result];
        };

        // shift to black and white
        color = luminosity();

        color[0] += color[0] * params.offsetRed; // red
        color[1] += color[1] * params.offsetGreen; // green
        color[2] -= params.negativeBlue; // intensity

        color[0] = (color[0] > 255) ? 255 : Math.floor(color[0]);
        color[1] = (color[1] > 255) ? 255 : Math.floor(color[1]);
        color[2] = (color[2] > 255) ? 255 : Math.floor(color[2]);

        if (oBlue < 0) { oBlue = 0;}
        
        return [color,alpha];
    },

    apply_filter: function (frame, mode, filter, params) {
        var i = 0,
            range = 4,
            sample,
            resample,
            method;

        switch (mode) {
            case "inverse":
                method = utils.video.colorToInverse;
                break;

            case "sepia":
                method = utils.video.colorToSepia;
                break;

            case "xray":
                console.log('xray mode');
                method = utils.video.colorToXRay;
                break;

            default:
                method = utils.video.colorToGrayscale;
                break;
        }

        for (; i < frame.data.byteLength; i+=4) {
            // create memory efficient array item for the rgba values from array buffer
            sample = new Array(4);
            sample[0] = frame.data[i];
            sample[1] = frame.data[i+1];
            sample[2] = frame.data[i+2];
            sample[3] = frame.data[i+3];

            // convert the image pixels
            resample = method.apply(null, [sample, filter, params]);

            frame.data[i] = resample[0][0];
            frame.data[i+1] = resample[0][1];
            frame.data[i+2] = resample[0][2];
            frame.data[i+3] = resample[1];
        }
        
        //frame.data = frame.data;
        return frame;
    },
    
    colorToRGB: function (color, alpha) {
        if (!color) {throw new Error("missing color parameter");}
        // test color
        if (typeof color === 'string' && color[0] === '#') {
            color = parseInt(color.slice(1),16);
        }
        alpha = (alpha === undefined) ? 1 : alpha;

        // extract component values
        var r = color >> 16 & 0xFF,
            g = color >> 8 & 0xFF,
            b = color & 0xFF,
            a = (alpha < 0) ? 0 : ((alpha > 1) ? 1 : alpha); // check range

        // use 'rgba' if needed
        if (a === 1) {
            return "rgb(" + r + "," + g + "," + b + ")";
        } else {
            return "rgba(" + r + "," + g + "," + b + "," + a + ")";
        }
    }

} 
