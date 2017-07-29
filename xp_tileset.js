/*:
 * @plugindesc xp tileset.
 * @author Garfeng
 *
 * @param over tags
 * @desc 用于设置高度的地形标记，必须为json数组，数组键值为整数，不能有0
 * @default [1,2]
 *
 * @param default over bind tag
 * @desc 原来的默认☆符号绑定的地形标记，必须为上个参数里的某一个值
 * @default 1
 *
 * @param Pass Region Id
 * @desc 强制可通行的区域标记
 * @default 9
 * 
 * @param Block Region Id
 * @desc 强制不可通行的区域标记
 * @default 10
 */

var parameters = PluginManager.parameters('xp_tileset');
var TAGS = JSON.parse(parameters['over tags']);
var DEFAULT_X_TAG = parseInt(parameters['default over bind tag'], 10);

var REGION_PASS_ID = parseInt(parameters['Pass Region Id']);
var REGION_BLOCK_ID = parseInt(parameters['Block Region Id']);


function inArray(arr, value) {
  return arr.indexOf(value) >= 0;
}

if (!inArray(TAGS, DEFAULT_X_TAG)) {
  throw new Error("xp_tileset Error : para default_over_bind_tag must be in over_tags");
}
if (inArray(TAGS, 0)) {
  throw new Error("xp_tileset Error : you set 0 in over tags");
}

TAGS.unshift(0);

var TAGS_Z_MAP = {};

for (var i in TAGS) {
  TAGS_Z_MAP[TAGS[i]] = i;
}

/**
 * @method _createLayers
 * @private
 */
Tilemap.prototype._createLayers = function() {
  var width = this._width;
  var height = this._height;
  var margin = this._margin;
  var tileCols = Math.ceil(width / this._tileWidth) + 1;
  var tileRows = Math.ceil(height / this._tileHeight) + 1;
  var layerWidth = tileCols * this._tileWidth;
  var layerHeight = tileRows * this._tileHeight;
  this._lowerBitmap = new Bitmap(layerWidth, layerHeight);
  this._upperBitmap = new Bitmap(layerWidth, layerHeight);
  this._layerWidth = layerWidth;
  this._layerHeight = layerHeight;

  /*
   * Z coordinate:
   *
   * 0 : Lower tiles
   * 1 : Lower characters
   * 3 : Normal characters
   * 4 : Upper tiles
   * 5 : Upper characters
   * 6 : Airship shadow
   * 7 : Balloon
   * 8 : Animation
   * 9 : Destination
   */

  this._lowerLayer = new Sprite();
  this._lowerLayer.move(-margin, -margin, width, height);
  this._lowerLayer.z = 0;

  this._upperLayer = new Sprite();
  this._upperLayer.move(-margin, -margin, width, height);
  this._upperLayer.z = 4;

  for (var i = 0; i < 4; i++) {
    this._lowerLayer.addChild(new Sprite(this._lowerBitmap));
    this._upperLayer.addChild(new Sprite(this._upperBitmap));
  }

  this.addChild(this._lowerLayer);
  this.addChild(this._upperLayer);
};


Tilemap.prototype._upperIndex = function(tileId) {
  //var flags = $gameMap.tilesetFlags();
  //console.log(flags)
  var tag = this.flags[tileId] >> 12;
  if (typeof TAGS_Z_MAP[tag] != "undefined") {
    if (TAGS_Z_MAP[tag] > 0) {
      return TAGS_Z_MAP[tag];
    } else if (this._isHigherTile(tileId)) {
      return TAGS_Z_MAP[DEFAULT_X_TAG];
    } else {
      return 0
    }
  } else if (this._isHigherTile(tileId)) {
    return TAGS_Z_MAP[DEFAULT_X_TAG];
  } else {
    return 0;
  }
};
/**
 * @method _paintTiles
 * @param {Number} startX
 * @param {Number} startY
 * @param {Number} x
 * @param {Number} y
 * @private
 */
Tilemap.prototype._paintTiles = function(startX, startY, x, y) {
  var tableEdgeVirtualId = 10000;
  var mx = startX + x;
  var my = startY + y;
  var dx = (mx * this._tileWidth).mod(this._layerWidth);
  var dy = (my * this._tileHeight).mod(this._layerHeight);
  var lx = dx / this._tileWidth;
  var ly = dy / this._tileHeight;
  var tileId0 = this._readMapData(mx, my, 0);
  var tileId1 = this._readMapData(mx, my, 1);
  var tileId2 = this._readMapData(mx, my, 2);
  var tileId3 = this._readMapData(mx, my, 3);
  var shadowBits = this._readMapData(mx, my, 4);
  var upperTileId1 = this._readMapData(mx, my - 1, 1);
  var lowerTiles = [];
  var upperTiles = [];

  if (this._isHigherTile(tileId0)) {
    upperTiles.push(tileId0);
  } else {
    lowerTiles.push(tileId0);
  }
  if (this._isHigherTile(tileId1)) {
    upperTiles.push(tileId1);
  } else {
    lowerTiles.push(tileId1);
  }

  lowerTiles.push(-shadowBits);

  if (this._isTableTile(upperTileId1) && !this._isTableTile(tileId1)) {
    if (!Tilemap.isShadowingTile(tileId0)) {
      lowerTiles.push(tableEdgeVirtualId + upperTileId1);
    }
  }

  if (this._isOverpassPosition(mx, my)) {
    upperTiles.push(tileId2);
    upperTiles.push(tileId3);
  } else {
    if (this._isHigherTile(tileId2)) {
      upperTiles.push(tileId2);
    } else {
      lowerTiles.push(tileId2);
    }
    if (this._isHigherTile(tileId3)) {
      upperTiles.push(tileId3);
    } else {
      lowerTiles.push(tileId3);
    }
  }

  var lastLowerTiles = this._readLastTiles(0, lx, ly);
  if (!lowerTiles.equals(lastLowerTiles) ||
    (Tilemap.isTileA1(tileId0) && this._frameUpdated)) {
    this._lowerBitmap.clearRect(dx, dy, this._tileWidth, this._tileHeight);
    for (var i = 0; i < lowerTiles.length; i++) {
      var lowerTileId = lowerTiles[i];
      if (lowerTileId < 0) {
        this._drawShadow(this._lowerBitmap, shadowBits, dx, dy);
      } else if (lowerTileId >= tableEdgeVirtualId) {
        this._drawTableEdge(this._lowerBitmap, upperTileId1, dx, dy);
      } else {
        this._drawTile(this._lowerBitmap, lowerTileId, dx, dy);
      }
    }
    this._writeLastTiles(0, lx, ly, lowerTiles);
  }

  var lastUpperTiles = this._readLastTiles(1, lx, ly);
  if (!upperTiles.equals(lastUpperTiles)) {
    this._upperBitmap.clearRect(dx, dy, this._tileWidth, this._tileHeight);
    for (var j = 0; j < upperTiles.length; j++) {
      this._drawTile(this._upperBitmap, upperTiles[j], dx, dy);
    }
    this._writeLastTiles(1, lx, ly, upperTiles);
  }
};

Tilemap.prototype._layerZIndex = function(i) {
  if (i == 0) {
    return 0;
  } else if (i > 0) {
    return 3 + 0.1 * i;
  } else {
    return 3 + 0.1 * (TAGS.length - 1);
  }
}

/**
 * Call after you update tileset
 *
 * @method updateBitmaps
 */
ShaderTilemap.prototype.refreshTileset = function() {
  var bitmaps = this.bitmaps.map(function(x) {
    return x._baseTexture ? new PIXI.Texture(x._baseTexture) : x;
  });

  this.allLayers.map(function(layer) {
    layer.setBitmaps(bitmaps)
  });

  //this.lowerLayer.setBitmaps(bitmaps);
  //this.upperLayer.setBitmaps(bitmaps);
  //this.upperLayerAll.setBitmaps(bitmaps);
};

ShaderTilemap.prototype._createALayer = function(z) {
  var parameters = PluginManager.parameters('ShaderTilemap');
  var useSquareShader = Number(parameters.hasOwnProperty('squareShader') ? parameters['squareShader'] : 0);
  var zIndex = this._layerZIndex(z);
  var zLayer = new PIXI.tilemap.ZLayer(this, zIndex);
  var layer = new PIXI.tilemap.CompositeRectTileLayer(zIndex, [], useSquareShader);
  this.addChild(zLayer);
  zLayer.addChild(layer)
  this.allZLayers.push(zLayer);
  this.allLayers.push(layer);
  if (z == 0) {
    this.lowerZLayer = zLayer;
    this.lowerLayer = layer;
    this.lowerLayer.shadowColor = new Float32Array([0.0, 0.0, 0.0, 0.5]);
  } else if (TAGS[z] == DEFAULT_X_TAG) {
    this.upperZLayer = zLayer;
    this.upperLayer = layer;
  }
}

/**
 * @method _createLayers
 * @private
 */
ShaderTilemap.prototype._createLayers = function() {
  var width = this._width;
  var height = this._height;
  var margin = this._margin;
  var tileCols = Math.ceil(width / this._tileWidth) + 1;
  var tileRows = Math.ceil(height / this._tileHeight) + 1;
  var layerWidth = this._layerWidth = tileCols * this._tileWidth;
  var layerHeight = this._layerHeight = tileRows * this._tileHeight;
  this._needsRepaint = true;
  this.allZLayers = [];
  this.allLayers = [];

  if (!this.lowerZLayer) {
    //@hackerham: create layers only in initialization. Doesn't depend on width/height
    for (var i in TAGS) {
      this._createALayer(i);
    }
  }
};

Tilemap.prototype._drawATileId = function(tileId, x, y) {
  var index = this._upperIndex(tileId);
  this._drawTile(this.allLayers[index].children[0], tileId, x, y);
}

/**
 * @method _updateLayerPositions
 * @param {Number} startX
 * @param {Number} startY
 * @private
 */
var a = null;
ShaderTilemap.prototype._updateLayerPositions = function(startX, startY) {
  if (this.roundPixels) {
    var ox = Math.floor(this.origin.x);
    var oy = Math.floor(this.origin.y);
  } else {
    ox = this.origin.x;
    oy = this.origin.y;
  }
  /*
  this.lowerZLayer.position.x = startX * this._tileWidth - ox;
  this.lowerZLayer.position.y = startY * this._tileHeight - oy;
  this.upperZLayer.position.x = startX * this._tileWidth - ox;
  this.upperZLayer.position.y = startY * this._tileHeight - oy;
  this.upperZLayerAll.position.x = startX * this._tileWidth - ox;
  this.upperZLayerAll.position.y = startY * this._tileHeight - oy;
  */
  a = this;
  for (var i in this.allZLayers) {
    var zLayer = this.allZLayers[i];
    zLayer.position.x = startX * this._tileWidth - ox;
    zLayer.position.y = startY * this._tileHeight - oy;
  }
};

/**
 * @method _paintAllTiles
 * @param {Number} startX
 * @param {Number} startY
 * @private
 */
ShaderTilemap.prototype._paintAllTiles = function(startX, startY) {
  this.allZLayers.map(function(d) {
    d.clear()
  });

  var tileCols = Math.ceil(this._width / this._tileWidth) + 1;
  var tileRows = Math.ceil(this._height / this._tileHeight) + 1;
  for (var y = 0; y < tileRows; y++) {
    for (var x = 0; x < tileCols; x++) {
      this._paintTiles(startX, startY, x, y);
    }
  }

};

Tilemap.prototype._haveToNoOne = function(x, y, index, func) {
  var upperId1 = this._readMapData(x, y - 1, index);
  var Id1 = this._readMapData(x, y, index);
  return func(upperId1) && (!func(Id1));
};

Tilemap.prototype._haveToNo = function(x, y, index, func) {
  return this._haveToNoOne(x, y, index, func) || this._haveToNoOne(x - 1, y, index, func) ||
    this._haveToNoOne(x + 1, y, index, func);
};

Tilemap.prototype._blankToRoof = function(x, y) {
  var func = function(tileId) {
    return !Tilemap.isWallTopTile(tileId);
  }
  return this._haveToNoOne(x, y, 0, func);
};

Tilemap.prototype._tableToFloor = function(x, y) {
  var func = this._isTableTile.bind(this);
  return this._haveToNo(x, y, 1, func);
};

/**
 * @method _paintTiles
 * @param {Number} startX
 * @param {Number} startY
 * @param {Number} x
 * @param {Number} y
 * @private
 */
ShaderTilemap.prototype._paintTiles = function(startX, startY, x, y) {

  var mx = startX + x;
  var my = startY + y;
  var dx = x * this._tileWidth,
    dy = y * this._tileHeight;
  var tileId0 = this._readMapData(mx, my, 0);
  var tileId1 = this._readMapData(mx, my, 1);
  var tileId2 = this._readMapData(mx, my, 2);
  var tileId3 = this._readMapData(mx, my, 3);
  var shadowBits = this._readMapData(mx, my, 4);
  var upperTileId1 = this._readMapData(mx, my - 1, 1);
  var upperLeftId1 = this._readMapData(mx - 1, my - 1, 1);
  var upperRightId1 = this._readMapData(mx + 1, my - 1, 1);
  var LeftId1 = this._readMapData(mx - 1, my, 1);
  var RightId1 = this._readMapData(mx + 1, my, 1);

  var lowerLayer = this.lowerLayer.children[0];
  var upperLayer = this.upperLayer.children[0];
  var upperLayer1 = this.allLayers[1].children[0];


  this._drawATileId(tileId0, dx, dy);
  this._drawATileId(tileId1, dx, dy);

  this._drawShadow(lowerLayer, shadowBits, dx, dy);
  if (this._tableToFloor(mx, my)) {
    if (!Tilemap.isShadowingTile(tileId0)) {
      this._drawTableEdge(lowerLayer, upperTileId1, dx, dy);
    }
  }

  /*
  if(this._blankToRoof(mx,my)){
    //this._drawUpperEdge(upperLayer1,tileId0,dx,dy);
    this._drawAutotile(upperLayer1,tileId0,dx,dy);
  }
  */

  if (this._isOverpassPosition(mx, my)) {
    this._drawTile(upperLayer, tileId2, dx, dy);
    this._drawTile(upperLayer, tileId3, dx, dy);
  } else {
    this._drawATileId(tileId2, dx, dy);
    this._drawATileId(tileId3, dx, dy);
  }
};



/**
 * @method _drawAutotile
 * @param {Array} layers
 * @param {Number} tileId
 * @param {Number} dx
 * @param {Number} dy
 * @private
 */
ShaderTilemap.prototype._drawAutotile = function(layer, tileId, dx, dy) {
  var autotileTable = Tilemap.FLOOR_AUTOTILE_TABLE;
  var kind = Tilemap.getAutotileKind(tileId);
  var shape = Tilemap.getAutotileShape(tileId);
  var tx = kind % 8;
  var ty = Math.floor(kind / 8);
  var bx = 0;
  var by = 0;
  var setNumber = 0;
  var isTable = false;
  var animX = 0,
    animY = 0;

  if (Tilemap.isTileA1(tileId)) {
    setNumber = 0;
    if (kind === 0) {
      animX = 2;
      by = 0;
    } else if (kind === 1) {
      animX = 2;
      by = 3;
    } else if (kind === 2) {
      bx = 6;
      by = 0;
    } else if (kind === 3) {
      bx = 6;
      by = 3;
    } else {
      bx = Math.floor(tx / 4) * 8;
      by = ty * 6 + Math.floor(tx / 2) % 2 * 3;
      if (kind % 2 === 0) {
        animX = 2;
      } else {
        bx += 6;
        autotileTable = Tilemap.WATERFALL_AUTOTILE_TABLE;
        animY = 1;
      }
    }
  } else if (Tilemap.isTileA2(tileId)) {
    setNumber = 1;
    bx = tx * 2;
    by = (ty - 2) * 3;
    isTable = this._isTableTile(tileId);
  } else if (Tilemap.isTileA3(tileId)) {
    setNumber = 2;
    bx = tx * 2;
    by = (ty - 6) * 2;
    autotileTable = Tilemap.WALL_AUTOTILE_TABLE;
    var isRoof = Tilemap.isRoofTile(tileId);
  } else if (Tilemap.isTileA4(tileId)) {
    setNumber = 3;
    bx = tx * 2;
    by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0));
    var isWall = Tilemap.isWallTopTile(tileId);
    if (ty % 2 === 1) {
      autotileTable = Tilemap.WALL_AUTOTILE_TABLE;
    }
  }

  var table = autotileTable[shape];
  var w1 = this._tileWidth / 2;
  var h1 = this._tileHeight / 2;
  for (var i = 0; i < 4; i++) {
    var qsx = table[i][0];
    var qsy = table[i][1];
    var sx1 = (bx * 2 + qsx) * w1;
    var sy1 = (by * 2 + qsy) * h1;
    var dx1 = dx + (i % 2) * w1;
    var dy1 = dy + Math.floor(i / 2) * h1;
    if (isTable && (qsy === 1 || qsy === 5)) {
      var qsx2 = qsx;
      var qsy2 = 3;
      if (qsy === 1) {
        //qsx2 = [0, 3, 2, 1][qsx];
        qsx2 = (4 - qsx) % 4;
      }
      var sx2 = (bx * 2 + qsx2) * w1;
      var sy2 = (by * 2 + qsy2) * h1;
      layer.addRect(setNumber, sx2, sy2 - 8, dx1, dy1, w1, h1 + 8, animX, animY);
      layer.addRect(setNumber, sx1, sy1, dx1, dy1 + h1 / 2 + 8, w1, h1 / 2, animX, animY);
    }
    /*else if (isWall && (qsy === 0 || qsy === 2)) {
      var qsx2 = qsx;
      var qsy2 = 4;
      if (qsy === 0) {
            //qsx2 = [0, 3, 2, 1][qsx];
            qsx2 = (4-qsx)%4;
      }
      var sx2 = (bx * 2 + qsx2) * w1;
      var sy2 = (by * 2 + qsy2) * h1;
      layer.addRect(setNumber, sx2, sy2, dx1, dy1, w1, h1, animX, animY);
      //layer.addRect(setNumber, sx1, sy1, dx1, dy1+h1/2+8, w1, h1/2, animX, animY);

     }*/
    else {
      layer.addRect(setNumber, sx1, sy1, dx1, dy1, w1, h1, animX, animY);
    }
  }
};


/**
 * @method _drawTableEdge
 * @param {Array} layers
 * @param {Number} tileId
 * @param {Number} dx
 * @param {Number} dy
 * @private
 */
ShaderTilemap.prototype._drawTableEdge = function(layer, tileId, dx, dy) {
  if (Tilemap.isTileA2(tileId)) {
    var autotileTable = Tilemap.FLOOR_AUTOTILE_TABLE;
    var kind = Tilemap.getAutotileKind(tileId);
    var shape = Tilemap.getAutotileShape(tileId);
    var tx = kind % 8;
    var ty = Math.floor(kind / 8);
    var setNumber = 1;
    var bx = tx * 2;
    var by = (ty - 2) * 3;
    var table = autotileTable[shape];
    var w1 = this._tileWidth / 2;
    var h1 = this._tileHeight / 2;
    for (var i = 0; i < 2; i++) {
      var qsx = table[2 + i][0];
      var qsy = table[2 + i][1];
      var sx1 = (bx * 2 + qsx) * w1;
      var sy1 = (by * 2 + qsy) * h1 + h1 / 2;
      var dx1 = dx + (i % 2) * w1;
      var dy1 = dy + Math.floor(i / 2) * h1;
      var setp = 8;
      if (qsx > 1 && qsy == 1) {
        setp = 7;
      }
      layer.addRect(setNumber, sx1, sy1 - 8, dx1, dy1, w1, h1 / 2 + setp);
    }
  }
};

ShaderTilemap.prototype._drawUpperEdge = function(layer, tileId, dx, dy, bs) {
  /*
  if (Tilemap.isWallTopTile(tileId)) {
    var xbs = bs || 2;
    var autotileTable = Tilemap.FLOOR_AUTOTILE_TABLE;
    var kind = Tilemap.getAutotileKind(tileId);
    var shape = Tilemap.getAutotileShape(tileId);
    var tx = kind % 8;
    var ty = Math.floor(kind / 8);
    var setNumber = 3;
    var bx = tx * 2;
    var by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0));
    var table = autotileTable[shape];
    var w1 = this._tileWidth / 2;
    var h1 = this._tileHeight / 2;
    for (var i = 0; i < 2; i++) {
        var qsx = table[i][0];
        var qsy = table[i][1];
        var sx1 = (bx * 2 + qsx) * w1;
        var sy1 = (by * 2 + qsy) * h1 ;
        var dx1 = dx + (i % 2) * w1;
        var rh = (h1/2)*xbs;
        var dy1 = dy - rh;
        //var setp = 8;
        //if (qsx>1 && qsy==1) {setp = 7;}
        layer.addRect(setNumber, sx1, sy1, dx1, dy1, w1, rh);
    }
  }
  */
};

Game_Map.prototype._haveToNoOne = function(x, y, index, func) {
  var upperId1 = this.tileId(x, y - 1, index);
  var Id1 = this.tileId(x, y, index);
  return func(upperId1) && (!func(Id1));
};

Game_Map.prototype._haveToNo = function(x, y, index, func) {
  return this._haveToNoOne(x, y, index, func) || this._haveToNoOne(x - 1, y, index, func) ||
    this._haveToNoOne(x + 1, y, index, func);
};
Game_Map.prototype._blankToRoof = function(x, y) {
  var func = function(tileId) {
    return !Tilemap.isWallTopTile(tileId);
  }
  return this._haveToNoOne(x, y, 0, func);
};

Game_Map.prototype.terrainTagOfId = function(tileId) {
  var flags = this.tilesetFlags();
  var flag = flags[tileId];
  return flag >> 12;
};

var Garfeng_Game_Map_checkPassage = Game_Map.prototype.checkPassage;

Game_Map.prototype.checkPassage = function(x, y, bit) {
  if (this.regionId(x, y) == REGION_PASS_ID) {
    return true;
  }

  if (this.regionId(x, y) == REGION_BLOCK_ID) {

    return false;
  }
  return Garfeng_Game_Map_checkPassage.call(this, x, y, bit);
};

Sprite_Character.prototype._layerZIndex = function(z) {
  if (z >= 0) {
    return 3 + 0.1 * z + 0.05;
  }
}

Sprite_Character.prototype.initialize = function(character) {
  Sprite_Base.prototype.initialize.call(this);
  this.initMembers();
  this.setCharacter(character);
};

Sprite_Character.prototype.updateCharacterFrame = function() {
  var pw = this.patternWidth();
  var ph = this.patternHeight();
  var sx = (this.characterBlockX() + this.characterPatternX()) * pw;
  var sy = (this.characterBlockY() + this.characterPatternY()) * ph;
  this.updateHalfBodySprites();

  if (this._bushDepth > 0) {
    var d = this._bushDepth;
    this._upperBody.setFrame(sx, sy, pw, ph - d);
    this._lowerBody.setFrame(sx, sy + ph - d, pw, d);
    this.setFrame(sx, sy, 0, ph);
  } else {
    //var ph2 = -this._character.shiftY() + this.parent._tileHeight + (this._character._realY - Math.ceil(this._character._realY)) * this.parent._tileHeight;
    //var sy2 = sy + ph - ph2;
    if (!this._character.isObjectCharacter() && this._character.screenZ() == 3) {
      var ph2 = -this._character.shiftY() + this.parent._tileHeight;
      var sy2 = sy + ph - ph2;
      //this.setFrame(sx, Math.max(sy2,sy) , pw, Math.min(ph,ph2));
      this.setFrame(sx, sy2, pw, ph2);
    } else {
      this.setFrame(sx, sy, pw, ph);
    }

  }
  this.updateAllUppers();
};

Sprite_Character.prototype.createUppers = function() {
  if (typeof this.allBodys == "object") {
    var tmp;
    console.log("remove")
    while ((tmp = this.allBodys.pop()) != null) {
      this.parent.removeChild(tmp);
      tmp = null;
    }
  }

  var z = this._character.screenZ();
  this.oldShiftY = this._character.shiftY();
  this.oldPatternHeight = this.patternHeight();
  if (z != 3) {
    this.UperBody = false;
    return;
  }
  var hAll = this.oldPatternHeight;
  if (hAll <= 1) {
    this.UperBody = false;
    return;
  }
  hAll += this.oldShiftY;
  var num = Math.ceil(hAll / this.parent._tileHeight);
  if (num < 2) {
    this.UperBody = false;
    return;
  }

  this.allBodys = [];
  this.UperBody = true;
  for (var i = 1; i <= num; i++) {
    var b = new Sprite();
    b.anchor.x = 0.5;
    b.anchor.y = 1;
    b.z = this._layerZIndex(i);
    console.log(b.z)
    b.visible = this.visible;
    b.bitmap = this.bitmap;
    b.bIndex = i;
    this.allBodys.push(b);
    this.parent.addChild(b);
  }
  var b = new Sprite();
  b.anchor.x = 0.5;
  b.anchor.y = 1;
  b.z = 3.9;
  b.visible = true;
  b.bitmap = this.bitmap;
  b.bIndex = num;
  this.allBodys.push(b);
  this.parent.addChild(b);
};

/*
Sprite_Character.prototype.hOfUpper = function (index){
  var px = this.characterPatternX();
  var py = this.characterPatternY();
  var w = this.patternWidth();
  var h = this.patternHeight();
  var sx = (this.characterBlockX() + px) * w;
  var sy = (this.characterBlockY() + py) * h;
  var allH = (Math.ceil(this._character._realY)
}
*/

Sprite_Character.prototype.updateAllUppers = function() {
  if (typeof this.oldShiftY == "undefined") {
    this.oldShiftY = this._character.shiftY();
  }
  if (typeof this.oldPatternHeight == "undefined") {
    this.oldPatternHeight = 0;
  }
  if ((typeof this.allBodys == "undefined" && typeof this.UperBody == "undefined") || (this.oldShiftY != this._character.shiftY()) || this.isImageChanged() || (this.oldPatternHeight != this.patternHeight())) {
    this.createUppers();
  }

  if (typeof this.allBodys != "undefined" && this.allBodys.length > 0 && this._character.characterName() == "") {
    this.createUppers();
  }
  if (this.UperBody) {
    for (var i = 0; i < this.allBodys.length; i++) {
      var w = this.patternWidth();
      var h = this.patternHeight();
      var b = this.allBodys[i];
      var x = this._character.screenX();
      var sx = (this.characterBlockX() + this.characterPatternX()) * w;
      var sy = (this.characterBlockY() + this.characterPatternY()) * h;
      var shiftY_Y = Math.ceil((this._character._realY - this._character._realY) * this.parent._tileHeight);

      if (i < this.allBodys.length - 1) {
        var dh = this.parent._tileHeight * b.bIndex - this._character.shiftY() - shiftY_Y;
        //dh = Math.max(0, dh);
        var y = this._character.screenY() - dh;
        var rh = Math.min(h - dh, this.parent._tileHeight);
        //rh = Math.max(0, rh);
        var rsy = sy + h - dh - rh;
        rsy = Math.max(rsy, sy);
        rh = Math.max(0, rh);
        b.setFrame(sx, rsy, w, rh);
        b.opacity = this.opacity;
        b.visible = this.visible;
      } else {
        var y = this._character.screenY();
        b.setFrame(sx, sy, w, h);
        b.opacity = this.opacity * 0.15;
      }

      if (this._character.isTransparent()) {
        b.visible = false;
      }

      b.x = x;
      b.y = y;
      b.bitmap = this.bitmap;
      b.setBlendColor(this.getBlendColor());
      b.setColorTone(this.getColorTone());
    }
  }
};
