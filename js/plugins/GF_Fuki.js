//=============================================================================
//GF_Fuki.js
//=============================================================================
/**
 * @Author:      Garfeng Gu
 * @Email:       mistower@foxmail.com
 * @CreateTime:  2015-12-12 21:44:12
 * @LastModified:2016-06-03

 * @Description: 呼出对话框 for RPG Maker MV
 *               在使用时，添加[文本显示]，填写\fuki[eventId]正文内容，即可在游
 *               戏里将对话框定位到相应角色上方，eventId设为0时，对应主角。
 *               如：\fuki[1]你好，阿尔西斯。
 *               强烈推荐使用下方页面的自动换行脚本：
 *               http://rm.66rpg.com/thread-386230-1-1.html
 *               暂时跟yep_mseeage不兼容。

 * @License:     MIT 协议 您可以用于任何商业或非商业用途

 * @警告：写这段代码时，我对JavaScript的类继承重用等东西只有个模糊的概念，
 *        所以这段代码是乱七八糟的，可能给你的游戏带来任何奇怪的BUG，请谨慎使用，
 *        尽量不要用在正式的游戏中，我测试过各种角色运动环境后，会发布一个正式版本。
 */




var GF_Fuki_Wait = 3; //fps,1/60s


// alert($gameSwitches.value(1));


Window_Base.prototype.makeFontBigger = function() {
    if (this.contents.fontSize <= 96) {
        this.contents.fontSize += 12;
    }
};

Window_Base.prototype.makeFontSmaller = function() {
    if (this.contents.fontSize >= 22) {
        this.contents.fontSize -= 6;
    }
};

ImageManager.isReady = function() {
    for (var key in this._cache) {
        var bitmap = this._cache[key];
        if (bitmap.isError()) {
            return true;
            //throw new Error('Failed to load: ' + bitmap.url);
        }
        if (!bitmap.isReady()) {
            return false;
        }
    }
    return true;
};




//没有使用YEP_MessageCore的童鞋请将这一段的注释删掉
Window_Message.prototype.startMessage = function()
{
    this._textState = {};
    this._textState.index = 0;
    var text = this.convertEscapeCharacters($gameMessage.allText());
    this.GF_align = "left";
    text = this.getFukiId(text);
    this._textState.text = text;
    this.updatePlacement();
    this.newPage(this._textState);
    this.updateBackground();    
    this.open();
    this._faceWindow.open();

}

Window_Message.prototype.processEscapeCharacter = function(code, textState) {
    switch (code) {
    case '$':
        this._goldWindow.open();
        break;
    case '.':
        this.startWait(5 + GF_Fuki_Wait);
        break;
    case '|':
        this.startWait(60 + GF_Fuki_Wait);
        break;
    case '!':
        this.startPause();
        break;
    case '>':
        this._lineShowFast = true;
        break;
    case '<':
        this._lineShowFast = false;
        break;
    case '^':
        this._pauseSkip = true;
        break;
    default:
        Window_Base.prototype.processEscapeCharacter.call(this, code, textState);
        break;
    }
};



/*
//使用了YEP_MessageCore的童鞋请把YEP_MessageCore里的
//Window_Message.prototype.adjustWindowSettings 
//和Window_Message.prototype.convertEscapeCharacters做如下修改。
Window_Message.prototype.adjustWindowSettings = function() {
    if(this.setfuki == undefined || this.setfuki == 0){ //Add by Garfeng Gu
        this.width = this.windowWidth();
        this.height = Math.min(this.windowHeight(), Graphics.boxHeight);
        if (Math.abs(Graphics.boxHeight - this.height) < this.lineHeight()) {
            this.height = Graphics.boxHeight;
        }
        this.createContents();
        this.x = (Graphics.boxWidth - this.width) / 2;
    }//Add by Garfeng Gu
};

Window_Message.prototype.convertEscapeCharacters = function(text) {
    text = Window_Base.prototype.convertEscapeCharacters.call(this, text);
    text = this.getFukiId(text);//Add by Garfeng Gu
    text = this.convertNameBox(text);
    text = this.convertMessageCharacters(text);
    return text;
};
*/

Window_Message.prototype.updatePlacement = function() {
    this._positionType = $gameMessage.positionType();
    if(this.setfuki == undefined || this.setfuki==0){
    this.width = this.windowWidth();
    this.height = this.windowHeight();
    this.y = this._positionType * (Graphics.boxHeight - this.height) / 2;
    this.x = 0;
    this._goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - this._goldWindow.height;
}
};


var GF_Fuki_Update_Back = Window_Message.prototype.update;
Window_Message.prototype.update = function(){
    //GF_Fuki_Update_Back.call(this);
    //this.x -- ;

    this.checkToNotClose();
    Window_Base.prototype.update.call(this);
    while (!this.isOpening() && !this.isClosing()) {
        if(this.setfuki && this.setfuki>0&&this.isOpen()){
            this.fukiPlacement(this.GF_EventId,this.GF_Text);
        }
        if (this.updateWait()) {
            return;
        } else if (this.updateLoading()) {            
            return;
        } else if (this.updateInput()) {
            return;
        } else if (this.updateMessage()) {
            return;
        } else if (this.canStart()) {
            this.startMessage();
        } else {
            this.startInput();
            return;
        }
    }
}



Window_Message.prototype.getFukiId = function(text)
{
    //fuki
    var eventid = -1;
    text = text.replace(/\x1bFUKI\[(\d+)\]/gi,function(){
        eventid = arguments[1];
        return "";
    });
    if(eventid>=0){
        this.GF_Fuki_Wait = GF_Fuki_Wait;
        this._background = $gameMessage.background();
        this._positionType = $gameMessage.positionType();
        this.down = null;
        this.fukiPlacement(eventid,text);
    }
    else
    {

        this.setfuki = 0;
    }

    return text;
};

function Face_window(){
    this.initialize.apply(this,arguments);
}

Face_window.prototype = Object.create(Window_Base.prototype);
Face_window.prototype.constructor = Face_window;



Face_window.prototype.initialize = function(x,y) {
    Window_Base.prototype.initialize.call(this);
    this.width = Window_Base._faceWidth + this.standardPadding() * 2;
    this.height = Window_Base._faceHeight +this.standardPadding() * 2;
    this.createContents();
    this.x = x;
    this.y = y;
    this._positionType = 0;
    this._waitCount = 0;
    this._faceBitmap = null;
    this._textState = null;
    this._background = 0;
    this.openness = 0;
    this.setBackgroundType(this._background);
    //this.clearFlags();
};


Window_Base.prototype.standardPadding = function() {
    return 12;
};



Window_Message.prototype.createSubWindows = function() {
    this._goldWindow = new Window_Gold(0, 0);
    this._goldWindow.x = Graphics.boxWidth - this._goldWindow.width;
    this._goldWindow.openness = 0;
    this._choiceWindow = new Window_ChoiceList(this);
    this._numberWindow = new Window_NumberInput(this);
    this._itemWindow = new Window_EventItem(this);
    this._faceWindow = new Face_window(this.x,this.y);
};

function Sharp_Window(){
    this.initialize.apply(this,arguments);
}

Window_Message.prototype.subWindows = function() {
    return [this._goldWindow, this._choiceWindow,
            this._numberWindow, this._itemWindow,
            this._faceWindow];
};


Face_window.prototype.updatePlacement = function(x,y,height,down) {
    // body...
    down = down || false;
    this.x = x - this.width;
    if (down) {
        this.y = y ;
    } else {
        this.y = y + height - this.height ;
    }
    //this.contents.clear();
};
Face_window.prototype.start = function() {
    Window_Base.prototype.open.call(this);
};

Window_Message.prototype.drawMessageFace = function() {
    //this.faceWindow = new Face_window(this.x,this.y,$gameMessage);
    this._faceWindow.drawFace($gameMessage.faceName(), $gameMessage.faceIndex(), 0,0);
    //this.drawFace($gameMessage.faceName(), $gameMessage.faceIndex(), 0, 0);
};

Window_Message.prototype.loadMessageFace = function() {
    this._faceWindow.contents.clear();
    this._faceWindow._faceBitmap = ImageManager.loadFace($gameMessage.faceName());
    if($gameMessage.faceName() != ""){
         if(this.setfuki == 1){
            this._faceWindow.show();
        } else {
            this._faceWindow.hide();
        }
    } else {
        this._faceWindow.hide();
    }

};

Window_Message.prototype.newLineX = function() {
    return 0 ;
};

SceneManager._screenHeight      = 480;
SceneManager._boxHeight         = 480;



Window_Message.prototype.terminateMessage = function() {
    this.close();
    this._faceWindow.close();
    this._goldWindow.close();
    if(this._sharpWindow)
    {
        this._sharpWindow.visible = false;
    }
    $gameMessage.clear();
};


Window_Message.prototype.updateLoading = function() {
    if (this._faceWindow._faceBitmap) {
        if (ImageManager.isReady() && this._faceWindow.isOpen()) {
            this.drawMessageFace();
            this._faceWindow._faceBitmap = null;
            return false;
        } else {
            return true;
        }
    } else {
        return false;
    }
};



Scene_Map.prototype.createMessageWindow = function() {
    this._messageWindow = new Window_Message();
    this.addWindow(this._messageWindow);
    this._messageWindow.subWindows().forEach(function(window) {
        this.addWindow(window);
    }, this);
    var bitmap = ImageManager.loadSystem("sharp");
    var sharp = new Sprite(bitmap);
    sharp.width = 32;
    sharp.height = 64;
    sharp.visible = false;
    this._messageWindow._sharpWindow = sharp;
    this.addChild(sharp);
};

//$gameMap._events[1]._x == $gameMap._events[3]._x&&$gameMap._events[1]._y == $gameMap._events[3]._y

Window_Message.prototype.fukiPlacement = function (eventid,text)
{
        var idx,idy;
        var oldDown = this.down;
        var oldX,oldY;

        if(eventid!=0){
            idx = ($gameMap._events[eventid]||$gamePlayer)._realX;
            idy = ($gameMap._events[eventid]||$gamePlayer)._realY;
            oldX = ($gameMap._events[eventid]||$gamePlayer)._x;
            oldY = ($gameMap._events[eventid]||$gamePlayer)._y;
        }
        else
        {
            idx = $gamePlayer._realX;
            idy = $gamePlayer._realY;
            oldX = $gamePlayer._x;
            oldY = $gamePlayer._y;
        }

        if (oldX == idx && oldY == idy && (this.down !== null)) {
            return;
        } else {
            this.fukiRealPlace(eventid,text,idx,idy);
        }

};

Window_Message.prototype.GF_FitHeight = function(linenum){
    var lineHeight = this.contents.fontSize + 8;
    var res = lineHeight * (linenum) + this.standardPadding()*2;
    return res;
}


Window_Message.prototype.GF_CalcTextHeight = function(text) {
    var lastFontSize = this.contents.fontSize;
    var textHeight = 0;
    var lines = text.split('\n');
    var maxLines = lines.length;

    for (var i = 0; i < maxLines; i++) {
        var maxFontSize = this.contents.fontSize;
        var regExp = /\x1b[\{\}]/g;
        for (;;) {
            var array = regExp.exec(lines[i]);
            if (array) {
                if (array[0] === '\x1b{') {
                    this.makeFontBigger();
                }
                if (array[0] === '\x1b}') {
                    this.makeFontSmaller();
                }
                if (maxFontSize < this.contents.fontSize) {
                    maxFontSize = this.contents.fontSize;
                }
            } else {
                break;
            }
        }
        textHeight += maxFontSize + 8;
    }

    this.contents.fontSize = lastFontSize;
    return textHeight;
};



Window_Message.prototype.fukiRealPlace = function(eventid,text,idx,idy){
        var oldDown = this.down;
        var fuki_py = 32;
        this.GF_EventId = eventid;
        this.GF_Text = text
        this.contents.fontSize = this.standardFontSize();
        var EX_Big = "{";
        var EX_Small = "}";
        var match;

        var textHeight = this.GF_CalcTextHeight(text);


        match = text.split(EX_Big);
        for (var i = 0; i < match.length-1; i++) {
            this.makeFontBigger();
        }

        match = text.split(EX_Small);
        for (var i = 0; i < match.length-1; i++) {
            this.makeFontSmaller();
        }

        idx = $gameMap.adjustX(idx);
        idy = $gameMap.adjustY(idy);


        var ES = /\x1b.+\[(\d+)\]/gi;
        text = text.replace(ES,"");
        ES=/\x1b[\.|\!|\|\{\}]/gi;
        var text = text.replace(ES,"");//$.|!><^

        var width = this.windowWidth()*2/3 - this.standardPadding()*2;
        var height = this.windowHeight();
        var lines = text.split("\n");
        var linew = [];
        var maxw = 0;
        var linenum = 0;


        if (this._background == 1||this._positionType == 1) {
            idx = 0;
            idy = 2 + 4 * this._positionType;
            this.GF_align = "center";
            width = this.windowWidth() - this.standardPadding()*2;
        } else {
            this.GF_align = "left";
        }

    for (var i = 0; i <lines.length; i++) {
            if (lines[i]!= undefined) {
                linew[i] = this.textWidth(lines[i]);
                if (linew[i]>maxw) {
                    maxw = linew[i];
                }
                var tmp = linew[i]/width;
                linenum += Math.floor(tmp);
                if (tmp>Math.floor(tmp)) {
                    linenum += 1;
                }
            }
        }

        if (maxw < width) {
            width = maxw;
        }

        width += this.standardPadding()*2;

        if (this._background == 1 ||this._positionType == 1) {
            width = this.windowWidth();
        }



        if (linenum<=4) {
            height = textHeight+this.standardPadding()*2;//this.GF_FitHeight(linenum);
        } else {
            height = this.GF_FitHeight(4);
        }


        //alert(this.textWidth(text)+":"+this.windowWidth());
        var x = idx*48 + 24 - width/2;//
        var y = idy*48 - fuki_py - height;


        if ($gameMessage.faceName() !== "") {
            if (x<this._faceWindow.width+5) {
                x = this._faceWindow.width+5;
            } 
            if (y+height-this._faceWindow.height<0) {
                y = idy*48 + 32 + fuki_py;
                this.down = true;
            } else {
                this.down = false;
            }
        } else {
            if (y<0) {
                y=idy*48 + 32 + fuki_py;
                this.down = true;
            } else {
                this.down = false;
            }
            if (x<0) {x=0;}
        }

        if(x+width>Graphics.boxWidth) x = (Graphics.boxWidth - width);
        if(y+height>Graphics.boxHeight) y = Graphics.boxHeight - height;

        var sharpX = idx*48 + 8;
        var sharpY = 0;
        var drawY = 0;
        if (this.down == true) {
            sharpY = idy*48 + 32  + fuki_py - 14;
            drawY = 19;
        } else {
            sharpY = idy*48 - fuki_py - 5;
        }
        if (oldDown != this.down) {
            this._sharpWindow.setFrame(0,drawY,32,19);
        }

        //set to windows

        this.setfuki = 1;

        this.idx = idx;
        this.idy = idy;

        this.width = width ;
        this.height = height;
        this.x = x;
        this._sharpWindow.x = sharpX;

        this.y = y;
        this._sharpWindow.y = sharpY;
        if (this._positionType==2 && this._background == 0) {
            this._sharpWindow.visible = true;                
        }

        this._faceWindow.updatePlacement(this.x,this.y,this.height,this.down);
}


Window_Base.prototype.standardFontSize = function() {
    return 22; // 修改这里的数字
};




//=============================================================================
//End of File: fuki.js
//2015-12-16 20:29:07
//=============================================================================



var GF_AutoLine_Back = Window_Base.prototype.processNormalCharacter;
Window_Selectable.prototype.processNormalCharacter = GF_AutoLine_Back;
Window_Base.prototype.processNormalCharacter = function(textState){
        var c = textState.text[textState.index];
        var w = this.textWidth(c);
        if (this.width - 2 * this.standardPadding() - textState.x >= w) {
            this.contents.drawText(c, textState.x, textState.y, w * 2, textState.height);
            textState.index++;
            textState.x += w;
        } else {
            this.processNewLine(textState);
            textState.index--;
            this.processNormalCharacter(textState);
        }
}

Window_Base.prototype.processNewLine = function(textState) {
    textState.x = textState.left;
    console.log(textState.height,this.height,textState.y);

    textState.y += textState.height;
    textState.height = this.calcTextHeight(textState, false);
    textState.index++;
};


Window_Message.prototype.processNormalCharacter = function(textState) {
    var align = this.GF_align || "left";
    var waitNum = this.GF_Fuki_Wait || 0; 
    if (align != "center") {
        var c = textState.text[textState.index];
        var w = this.textWidth(c);
        if (this.width - 2 * this.standardPadding() - textState.x >= w) {
            this.contents.drawText(c, textState.x, textState.y, w * 2, textState.height);
            textState.index++;
            textState.x += w;
            this.startWait(waitNum);
        } else {
            this.processNewLine(textState);
            textState.index--;
            this.processNormalCharacter(textState);
        }
    } else {
        if (textState.x == textState.left) {
            var sy = textState.text.substr(textState.index);
            var txts = sy.split("\n");
            var ES=/\x1b[\.|\!|\|]/gi;
            var tmp = txts[0].replace(ES,"");//$.|!><^
            textState.x += (this.width - this.standardPadding()*2 - this.textWidth(tmp))/2;
            //console.log(this.width,this.textWidth(tmp),tmp);
        }

        var c = textState.text[textState.index];
        var w = this.textWidth(c);
        if (this.width - 2 * this.standardPadding() - textState.x >= w) {
            this.contents.drawText(c, textState.x, textState.y, w * 2, textState.height);
            textState.index++;
            textState.x += w;
            this.startWait(waitNum);
        } else {
            this.processNewLine(textState);
            textState.index--;
            this.processNormalCharacter(textState);
        }
    }
};


