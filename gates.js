

!function($s) {

  'use strict';

  var $ = $s.$;

 
  var unit = $s.unit;

  
  var defaultLEDColor = '#ff0000';
  var defaultLEDBgColor = '#000000';

  var multiplyColor = function() {
    var HEX = '0123456789abcdef';
    var toIColor = function(sColor) {
      if (!sColor) {
        return 0;
      }
      sColor = sColor.toLowerCase();
      if (sColor.match(/^#[0-9a-f]{3}$/i) ) {
        var iColor = 0;
        for (var i = 0; i < 6; i += 1) {
          iColor = (iColor << 4) | HEX.indexOf(sColor.charAt( (i >> 1) + 1) );
        }
        return iColor;
      } else if (sColor.match(/^#[0-9a-f]{6}$/i) ) {
        var iColor = 0;
        for (var i = 0; i < 6; i += 1) {
          iColor = (iColor << 4) | HEX.indexOf(sColor.charAt(i + 1) );
        }
        return iColor;
      }
      return 0;
    };
    var toSColor = function(iColor) {
      var sColor = '#';
      for (var i = 0; i < 6; i += 1) {
        sColor += HEX.charAt( (iColor >>> (5 - i) * 4) & 0x0f);
      }
      return sColor;
    };
    var toRGB = function(iColor) {
      return {
        r: (iColor >>> 16) & 0xff,
        g: (iColor >>> 8) & 0xff,
        b: iColor & 0xff};
    };
    var multiplyColor = function(iColor1, iColor2, ratio) {
      var c1 = toRGB(iColor1);
      var c2 = toRGB(iColor2);
      var mc = function(v1, v2, ratio) {
        return ~~Math.max(0, Math.min( (v1 - v2) * ratio + v2, 255) );
      };
      return (mc(c1.r, c2.r, ratio) << 16) |
        (mc(c1.g, c2.g, ratio) << 8) | mc(c1.b, c2.b, ratio);
    };
    return function(color1, color2, ratio) {
      return toSColor(multiplyColor(
          toIColor(color1), toIColor(color2), ratio) );
    };
  }();

  // kapı sembollerinin çizimleri
  var drawBUF = function(g, x, y, width, height) {
    g.moveTo(x, y);
    g.lineTo(x + width, y + height / 2);
    g.lineTo(x, y + height);
    g.lineTo(x, y);
    g.closePath(true);
  };
  var drawAND = function(g, x, y, width, height) {
    g.moveTo(x, y);
    g.curveTo(x + width, y, x + width, y + height / 2);
    g.curveTo(x + width, y + height, x, y + height);
    g.lineTo(x, y);
    g.closePath(true);
  };
  var drawOR = function(g, x, y, width, height) {
    var depth = width * 0.2;
    g.moveTo(x, y);
    g.curveTo(x + width - depth, y, x + width, y + height / 2);
    g.curveTo(x + width - depth, y + height, x, y + height);
    g.curveTo(x + depth, y + height, x + depth, y + height / 2);
    g.curveTo(x + depth, y, x, y);
    g.closePath(true);
  };
  var drawNOT = function(g, x, y, width, height) {
    drawBUF(g, x - 1, y, width - 2, height);
    g.drawCircle(x + width - 1, y + height / 2, 2);
  };

  // logical functions
  var AND = function(a, b) { return a & b; };
  var OR = function(a, b) { return a | b; };
  var BUF = function(a) { return (a == 1)? 1 : 0; };
  var NOT = function(a) { return (a == 1)? 0 : 1; };

  var onValue = 1;
  var offValue = null;
  var isHot = function(v) { return v != null; };
  var intValue = function(v) { return isHot(v)? 1 : 0; };

//mantık kapılarını oluşturmak için kullandığımız fonksiyon
  var createLogicGateFactory = function(op, out, draw) {
    return function(device) {
      var numInputs = (op == null)? 1 :
        Math.max(2, device.deviceDef.numInputs || 2);
      device.halfPitch = numInputs > 2;
      for (var i = 0; i < numInputs; i += 1) {
        device.addInput();
      }
      device.addOutput();
      var inputs = device.getInputs();
      var outputs = device.getOutputs();
      device.$ui.on('inputValueChange', function() {
        var b = intValue(inputs[0].getValue() );
        if (op != null) {
          for (var i = 1; i < inputs.length; i += 1) {
            b = op(b, intValue(inputs[i].getValue() ) );
          }
        }
        b = out(b);
        outputs[0].setValue( (b == 1)? 1 : null);
      });
      var super_createUI = device.createUI;
      device.createUI = function() {
        super_createUI();
        var size = device.getSize();
        var g = $s.graphics(device.$ui);
        g.attr['class'] = 'simcir-basicset-symbol';
        draw(g, 
          (size.width - unit) / 2,
          (size.height - unit) / 2,
          unit, unit);
        if (op != null) {
          device.doc = {
            params: [
              {name: 'numInputs', type: 'number',
                defaultValue: 2,
                description: 'number of inputs.'}
            ],
            code: '{"type":"' + device.deviceDef.type + '","numInputs":2}'
          };
        }
      };
    };
  };

  // 1 değeri gönderen devre elemanı
  $s.registerDevice('1', function(device) {
    device.addOutput();
    var super_createUI = device.createUI;
    device.createUI = function() {
      super_createUI();
      device.$ui.addClass('simcir-basicset-dc');
    };
    device.$ui.on('deviceAdd', function() {
      device.getOutputs()[0].setValue(onValue);
    });
    device.$ui.on('deviceRemove', function() {
      device.getOutputs()[0].setValue(null);
    });
  });
  //göstermelik olarak da olsa 0 değeri gönderen devre elemanı
  //boş bir input zaten 0 değerini alıyor fakat gösterebilmek için böyle bir
  //devre elemanı tasarladım
    $s.registerDevice('0', function(device) {
    device.addOutput();
    var super_createUI = device.createUI;
    device.createUI = function() {
      super_createUI();
      device.$ui.addClass('simcir-basicset-dc');
    };
    device.$ui.on('deviceAdd', function() {
      device.getOutputs()[0].setValue(null);
    });
    device.$ui.on('deviceRemove', function() {
      device.getOutputs()[0].setValue(null);
    });
  });

  // Led Devre eleamnını ekleyen fonksiyon
  $s.registerDevice('LED', function(device) {
    var in1 = device.addInput();
    var super_createUI = device.createUI;
    device.createUI = function() {
      super_createUI();
      var hiColor = device.deviceDef.color || defaultLEDColor;
      var bgColor = device.deviceDef.bgColor || defaultLEDBgColor;
      var loColor = multiplyColor(hiColor, bgColor, 0.25);
      var bLoColor = multiplyColor(hiColor, bgColor, 0.2);
      var bHiColor = multiplyColor(hiColor, bgColor, 0.8);
      var size = device.getSize();
      var $ledbase = $s.createSVGElement('circle').
        attr({cx: size.width / 2, cy: size.height / 2, r: size.width / 4}).
        attr('stroke', 'none').
        attr('fill', bLoColor);
      device.$ui.append($ledbase);
      var $led = $s.createSVGElement('circle').
        attr({cx: size.width / 2, cy: size.height / 2, r: size.width / 4 * 0.8}).
        attr('stroke', 'none').
        attr('fill', loColor);
      device.$ui.append($led);
      device.$ui.on('inputValueChange', function() {
        $ledbase.attr('fill', isHot(in1.getValue() )? bHiColor : bLoColor);
        $led.attr('fill', isHot(in1.getValue() )? hiColor : loColor);
      });
      device.doc = {
        params: [
          {name: 'color', type: 'string',
            defaultValue: defaultLEDColor,
            description: 'color in hexadecimal.'},
          {name: 'bgColor', type: 'string',
            defaultValue: defaultLEDBgColor,
            description: 'background color in hexadecimal.'}
        ],
        code: '{"type":"' + device.deviceDef.type +
        '","color":"' + defaultLEDColor + '"}'
      };
    };
  });


  // mantık kapılarını oluşturan fonksiyonların çağırılması
  $s.registerDevice('NOT', createLogicGateFactory(null, NOT, drawNOT) );
  $s.registerDevice('AND', createLogicGateFactory(AND, BUF, drawAND) );
  $s.registerDevice('OR', createLogicGateFactory(OR, BUF, drawOR) );



}(simcir);
