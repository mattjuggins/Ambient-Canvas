/**
* @Author: Matthew Juggins <matthewjuggins>
* @Date:   04-10-16
* @Email:  jugginsmatthew@gmail.com
* @Last modified by:   matthewjuggins
* @Last modified time: 26-10-16
* @Description:
*/



/*
 * Ambient Canvas.js
 * Matthew Juggins
 * Modified:
 *
 *
 * Possibly minor issue in Safari
 * Inspired by http://codepen.io/Lewitje/pen/dXpRmm
 */

// Additional array function
Array.prototype.rotate = function(n) {
  this.unshift.apply(this, this.splice(n, this.length))
  return this;
}

// Instruments and effects
var freeverb = new Tone.Freeverb(0.5, 2000).toMaster();
var polySynth = new Tone.PolySynth(4, Tone.FMSynth, {
  "volume": -3,
  "harmonicity": 0.5,
  "modulationIndex": 1.2,
  "oscillator": {
    "type": "fmsawtooth",
    "modulationType": "sine",
    "modulationIndex": 20,
    "harmonicity": 5
  },
  "envelope": {
    "attack": 1,
    "decay": 2,
    "sustain": 2,
    "release": 2
  },
  "modulation": {
    "type": "triangle"
  },
  "modulationEnvelope": {
    "attack": 0.5,
    "decay": 0.25,
    "sustain": 0.25,
    "release": 0.5
  }
}).connect(freeverb);
var ampEnv = new Tone.AmplitudeEnvelope({
  "attack": 0.5,
  "decay": 0.2,
  "sustain": 5,
  "release": 15
}).connect(freeverb);
var player1 = new Tone.Player({
  "loop": true,
  "volume": -12
}).connect(ampEnv);
var player2 = new Tone.Player({
  "loop": true,
  "volume": -12
}).connect(ampEnv);
var player3 = new Tone.Player({
  "loop": true,
  "volume": -12
}).connect(ampEnv);

// Very helpful plugin - https://gist.github.com/mekwall/1263939
(function($) {
  $.fn.textfill = function(maxFontSize) {
    maxFontSize = parseInt(maxFontSize, 10);
    return this.each(function() {
      var ourText = $("span", this),
        parent = ourText.parent(),
        maxHeight = parent.height(),
        maxWidth = parent.width(),
        fontSize = parseInt(ourText.css("fontSize"), 10),
        multiplier = maxWidth / ourText.width(),
        newSize = (fontSize * (multiplier - 0.1));
      ourText.css(
        "fontSize",
        (maxFontSize > 0 && newSize > maxFontSize) ?
        maxFontSize :
        newSize
      );
    });
  };
})(jQuery);

// Main App
(function($, window, document, undefined) {
  "use strict";

  var APP = {
    init: function() {
      this.canvas = $('#canvas')[0];
      this.canvasContext = canvas.getContext('2d');
      this.gridCanvas = $('#gridCanvas')[0];
      this.gridCanvasContext = gridCanvas.getContext('2d');
      this.paint = false;
      this.currentThickness = 48;
      this.previousPoint = [0, 0];
      this.currentColor = '#ff4351';
      this.currentTool = 'pencil';
      this.pencil = document.getElementsByClassName('pencil');
      this.currentBeat = 0;
      this.currentRange = 3;
      this.playing = false;
      this.currentChord = [];
      this.canvas.width = 1200;
      this.canvas.height = 960;
      this.gridCanvas.width = 1200;
      this.gridCanvas.height = 960;
      this.gridCanvasContext.textAlign = "center";
      this.notesArray = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      this.modulateAmount = 0;
      this.key = [];
      this.chords = [];
      this.chordIntervals = [
        [0, 4, 7, 11],
        [2, 5, 9, 12],
        [4, 7, 11, 14],
        [6, 9, 12, 15],
        [7, 11, 14, 18],
        [9, 12, 16, 19],
        [11, 14, 18, 21]
      ]; // Lydian mode chord progression, bit mysterious,somewhat ambient
      this.segmentNames = ["III", "VI", "II", "IV", "V", "VII", "I", "VII", "V", "IV", "II", "VI", "III"];
      this.horizontalSegmentNames = ["Plus a 7th", "Plus a 5th", "Plus a 3rd", "Root Note"];
      this.segmentIndexes = [2, 5, 1, 3, 4, 6, 0, 6, 4, 3, 1, 5, 2];
      this.segmentEndPoints = [1, 2, 4, 6, 9, 12, 16, 19, 22, 24, 26, 27, 28];
      this.segmentWidth = this.gridCanvas.width / 28;
      this.segmentHeight = this.gridCanvas.height / 4;

      this.demoPaint();
      $("#text-container-right").textfill();
      this.setGridFontsize();
      this.setKey();
      this.setChords();
      this.setUpListeners();
      this.setUpPlayers();
      this.setSynth(0);
    },

    // Sets up all button listeners and a resizing listener
    setUpListeners: function() {

      // Change color of other elements when new color selected
      $('.color').on('click', function() {
        $('.color.active').removeClass('active');
        $(this).addClass('active');
        APP.currentColor = $(this).data('color');
        $("#pencil-backing").css("background-color", APP.currentColor);
        $("#pencil-backing").css("color", APP.currentColor);
        $("#pencil-image").css("outline-color", APP.currentColor);
        if (APP.currentTool == 'pencil') {
          $(".thickness").css("color", APP.currentColor);
        };
        APP.setSynth($(this).data('color-number'));
      });

      // Line thickness change
      $('.thickness').on('click', function() {
        $('.thickness.active').removeClass('active');
        $(this).addClass('active');
        APP.currentThickness = $(this).data('thickness');
        polySynth.set({
          "volume": parseInt($(this).data('volume'))
        });
      });

      // Pencil tool seclection
      $('#pencil-image').on('click', function() {
        $('#eraser-image').removeClass('active');
        $(this).addClass('active');
        $(".thickness").css("color", APP.currentColor);
        APP.currentTool = $(this).data('tool');
      });

      // Eraser tool selection
      $('#eraser-image').on('click', function() {
        $('#pencil-image').removeClass('active');
        $(this).addClass('active');
        $(".thickness").css("color", "#FFF");
        APP.currentTool = $(this).data('tool');
      });

      // Beat selection
      $('.beat-button').on('click', function() {
        $('.beat-button.active').removeClass('active');
        $(this).addClass('active');
        if ($(this).data('beat') !== APP.currentBeat) {
          APP.currentBeat = $(this).data('beat');
          APP.setBeat();
        }
      });

      // Clear canvas button
      $('#clear-button').on('click', function() {
        APP.clearCanvas();
        APP.setKey();
        APP.setChords();
      });

      // Mouse movement, update location and paint
      $(gridCanvas).on('mousemove', function(e) {
        var x = e.offsetX * 2;
        var y = e.offsetY * 2;
        if (APP.paint) {
          APP.drawLine(x, y);
        }
      });

      // Mouse pressed on canvas
      $(gridCanvas).on('mousedown', function(e) {
        var pos = APP.getMousePos(APP.gridCanvas, e);
        APP.previousPoint = [(e.offsetX * 2), e.offsetY * 2];
        APP.canvasContext.beginPath();
        APP.canvasContext.moveTo(APP.previousPoint[0], APP.previousPoint[1]);
        APP.paint = true;
        ampEnv.triggerAttack();
        if (APP.currentTool == 'pencil') {
          APP.setCurrentChord(pos.x, pos.y);
          polySynth.triggerAttack(APP.currentChord);
        };
      });

      // Mouse released or leaves canvas area
      $(gridCanvas).on('mouseup mouseleave', function() {
        APP.paint = false;
        APP.canvasContext.closePath();
        ampEnv.triggerRelease();
        if (APP.currentTool == 'pencil') {
          polySynth.triggerRelease(APP.currentChord);
        };
      });

      // Overlay selector
      $('input[name=musicInfo]').change(function() {
        if ($(this).is(':checked')) {
          APP.overlayGrid();
          $("#text-container-right").css({
            "opacity": 1
          });
        } else {
          APP.clearGridCanvas();
          $("#text-container-right").css({
            "opacity": 0
          });
        }
      });

      // Window resizing
      $(window).on('resize', function() {
        APP.textFill();
      });

    },

    // Clears painting canvas
    clearCanvas: function() {
      this.canvasContext.clearRect(0, 0, 1200, 960);
    },

    // Painting functions
    clearGridCanvas: function() {
      this.gridCanvasContext.clearRect(0, 0, 1200, 960);
    },

    // Draws the initial quaver on the canvas
    demoPaint: function() {
      this.drawLine(700, 260);
      this.drawLine(600, 260);
      this.drawLine(600, 650);
      this.drawLine(550, 700);
      this.drawLine(500, 650);
      this.drawLine(550, 600);
      this.drawLine(600, 650);
    },

    // Draws a line
    drawLine: function(x, y) {
      this.canvasContext.lineTo(x, y);
      this.canvasContext.lineWidth = this.currentThickness;
      if (this.currentTool === "eraser") {
        this.canvasContext.strokeStyle = '#FFF';
      } else {
        this.canvasContext.strokeStyle = this.currentColor;
      }
      this.canvasContext.lineCap = 'round';
      this.canvasContext.lineJoin = 'round';
      this.canvasContext.stroke();
      this.previousPoint = [x, y];
    },

    // Traslate chords from intervals to notes accepted by tone.js instruments
    getChordNotes: function(chordIndexes) {
      var chord = [],
        interval = 0,
        octave = "";

      for (var i = 0; i < chordIndexes.length; i++) {
        interval = chordIndexes[i];

        if (interval < 0 - this.modulateAmount) {
          octave = "2";
        } else if (interval < 12 - this.modulateAmount) {
          octave = "3";
        } else if (interval < 24 - this.modulateAmount) {
          octave = "4";
        } else if (interval < 36 - this.modulateAmount) {
          octave = "5";
        } else {
          octave = "6";
        }

        while (interval < 0 || interval > 11) {
          if (Math.sign(interval) == 1) {
            interval -= 12;
          } else {
            interval += 12;
          }
        }
        chord[i] = this.notesArray[interval].concat(octave);
      }
      return chord;
    },

    // Get current mouse position on canvas
    getMousePos: function(canvas, evt) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
      };
    },

    // Overlays Grid on canvas
    overlayGrid: function() {
      this.clearGridCanvas();
      this.gridCanvasContext.save();
      this.gridCanvasContext.lineWidth = 2;
      this.gridCanvasContext.strokeStyle = 'rgba(0,0,0,0.5)';
      var previousWidth = 0,
        j = 0;

      // Horizontally split sections
      for (var i = 0; i <= this.gridCanvas.height; i = i + this.gridCanvas.height / 4) {
        this.gridCanvasContext.beginPath();
        this.gridCanvasContext.moveTo(0, i);
        this.gridCanvasContext.lineTo(gridCanvas.width, i);
        this.gridCanvasContext.closePath();
        this.gridCanvasContext.stroke();
        this.gridCanvasContext.fillText(this.horizontalSegmentNames[j], 50, i + (this.gridCanvas.height / 8));
        this.gridCanvasContext.fillText(this.horizontalSegmentNames[j], this.gridCanvas.width - 50, i + (this.gridCanvas.height / 8));
        j++;
      };

      // Vertically split sections
      for (var i = 0; i <= this.gridCanvas.width; i++) {
        this.gridCanvasContext.beginPath();
        this.gridCanvasContext.moveTo(this.segmentWidth * this.segmentEndPoints[i], 0);
        this.gridCanvasContext.lineTo(this.segmentWidth * this.segmentEndPoints[i], this.gridCanvas.height);
        this.gridCanvasContext.closePath();
        this.gridCanvasContext.stroke();
        this.gridCanvasContext.fillText(this.segmentNames[i], (this.segmentWidth * this.segmentEndPoints[i]) - (this.segmentWidth * (this.segmentEndPoints[i] - previousWidth) / 2), this.gridCanvas.height - 50);
        this.gridCanvasContext.fillText(this.segmentNames[i], (this.segmentWidth * this.segmentEndPoints[i]) - (this.segmentWidth * (this.segmentEndPoints[i] - previousWidth) / 2), 50);
        previousWidth = this.segmentEndPoints[i];
      }
      this.gridCanvasContext.restore();
    },

    // Start or stop the correct players
    setBeat: function() {
      if (this.currentBeat == 0) {
        player1.start();
        player2.stop();
        player3.stop();
      } else if (this.currentBeat == 1) {
        player1.stop();
        player2.start();
        player3.stop();
      } else if (this.currentBeat == 2) {
        player1.stop();
        player2.stop();
        player3.start();
      } else {
        console.error("This beat doesn't exist");
      }
    },

    // Sets current chord to play/stop
    setChords: function(x, y) {
      for (var i = 0; i < this.chordIntervals.length; i++) {
        this.chords[i] = this.getChordNotes(this.chordIntervals[i]);
      };
    },

    // Set the current chord relative to mousedown position on canvas
    setCurrentChord: function(x, y) {
      // Set chord relative to vertical grid segements
      var numerator = Math.floor(Math.floor(x) / (this.gridCanvas.width / 2 / 28)),
        index = 0,
        multiplier = 1,
        fullChord = [];
      while (numerator >= this.segmentEndPoints[index]) {
        index++;
      }
      fullChord = this.chords[this.segmentIndexes[index]];

      // Set number of notes from full chord to play based horizontal grid segements
      while (Math.floor(y) > (this.gridCanvas.height / 8) * multiplier) {
        multiplier++;
      }
      this.currentChord = fullChord.slice(0, (5 - multiplier));
    },

    // Calculates the appropriate font size for the font awesome icons
    setGridFontsize: function() {
      var fontSize = $("#gridCanvas").width() / 28, // 50% of container width
        fontText = fontSize.toString().concat("px Roboto Condensed");
      this.gridCanvasContext.font = fontText;
    },

    // Sets the key for the chord progressions generated and shifts the master array of notes by the correct amount
    setKey: function() {
      this.modulateAmount = Math.floor(Math.random() * (11 - 0 + 1)) + 0;
      this.notesArray.rotate(this.modulateAmount);
      this.key = this.notesArray[0];
    },

    // Give each colour different synth sound properties
    setSynth: function(sliceNumber) {
      var typeList = ["sine", "square", "triangle", "sawtooth"];
      polySynth.set({
        "modulationIndex": sliceNumber % 12,
        "harmonicity": (sliceNumber % 6) * 0.5,
        "oscillator": {
          "type": typeList[sliceNumber % 4]
        },
        "modulation": {
          "type": typeList[4 - (sliceNumber % 4)]
        }
      });
    },

    // Load audio into the sample players
    setUpPlayers: function() {
      self = this;
      player1.load("https://s3-us-west-2.amazonaws.com/s.cdpn.io/713593/beatA.mp3", function() {
        self.setBeat();
      });
      player2.load("https://s3-us-west-2.amazonaws.com/s.cdpn.io/713593/beatB.mp3");
      player3.load("https://s3-us-west-2.amazonaws.com/s.cdpn.io/713593/beatC.mp3");
    }
  };

  APP.init();
})(jQuery, window, document);
