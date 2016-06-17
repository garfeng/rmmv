//=============================================================================
//GF_ChairProperty.js
//=============================================================================

/*
地形标记：
7：人物上移24个像素，用来站在椅子上。
6：当5号开关开启时，人物在该位置上移24个像素，可以做成推箱子，正常情况下该位置照常行走，当把箱子推到该位置后，打开开关，人物就可以站在箱子上。
8：该位置无论是人物，还是地图事件，都会上移20个像素，有一些桌子太小，东西放在上面会有一半漏出来，设置该地形标记，可以把物品上移。
5：该位置人物只上移2个像素（默认是6个像素），相当于人物比正常情况下移了4个像素，使用情景自己体会。
*/

var GF_Region_SwitchId = 5; //修改成你需要的开关id

Game_CharacterBase.prototype.shiftY = function() {
    var res = this.isObjectCharacter() ? 0 : 6;
    var regionid = $gameMap.regionId(this._x,this._y);
    if(regionid == 7) {
        res = this.isObjectCharacter() ? 0 : 24;
    } else if(regionid == 6){
        if($gameSwitches.value(5)){
            res = this.isObjectCharacter() ? 0 : 24;
        }
    } else if(regionid == 8){
            res = this.isObjectCharacter() ? 20 : 6;     

    } else if(regionid == 5){
        res = 2;
    }
    return res;
};

//$gameMap._events[3]._x == $gameMap._events[2]._x&&$gameMap._events[3]._y == $gameMap._events[2]._y