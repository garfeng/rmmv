//=============================================================================
// GF_PreLoadEventBM.js
//=============================================================================

/*
* Load event's BlendMode when initialize.
* usage:
* add an event with note:"<bm>BlendMode</bm>"
* the BlendMode can be 1,2,3
* 1:add mode, such as light.
* Refer to rpg_sprites.js for more information.
*/

var GF_PreLoadEventBM_Back = Game_Event.prototype.initialize;
Game_Event.prototype.initialize = function(mapId, eventId) {
    GF_PreLoadEventBM_Back.call(this,mapId,eventId);

    var RE = /<bm>([^]*?)<\/bm>/ig;
    if ((match = RE.exec(this.event().note)) !== null) {
        var blendMode = 0;
        try {
            blendMode = parseInt(match[1]);
        } catch (e) {
            console.error(e);
            console.log(match[1]);
        }
        if (blendMode !== 0) {
            this._blendMode = blendMode;
        }
    }

};