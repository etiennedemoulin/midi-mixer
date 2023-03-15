// @TODO
// FADERS BANK VALUE AND NAME NEEDS TO BE GLOBALS SO UPDATED ON PURPOSE


var XT = require('node-mcu');


XT.on('debug', function(msg) {
    // console.log(':> ' + msg);
});

XT.on('action', function(action) {
    if (action.control === "fader") {
        // console.log(action);
        if (typeof action.state === 'number') {
            indexFader = name.indexOf(action.name);
            faders[indexFader+(page*8)] = action.state;
            bankFaderValue[indexFader] = action.state;
            XT.setFaderDisplay(bankFaderValue,'bottom');
        }
    }
    if (action.control === "button") {
        if (action.name === "FADER BANK RIGHT") {
            if (action.state === "down") {
                updatePage('up');
            }
        }
        if (action.name === "FADER BANK LEFT") {
            if (action.state === "up") {
                updatePage('down');
            }
        }
    }


    // if (action.)
    // console.log('X-Touch: ' + JSON.stringify(action));
});

function updatePage(sens) {
    // need to compute how many page
    bankFaderValue = [];
    bankFaderName = [];
    switch (sens) {
        case 'up':
            if (page < Math.floor(faders.length/8)) {
                page += 1;
                updateFaderBank(faders, page);
            } else {
                // console.log("cant go up than this")
            }
        break;
        case 'down':
            if (page > 0) {
                page -= 1;
                updateFaderBank(faders, page);
            } else {
                // console.log("cant go less than 0")
            }
        break;
        default:
    }
    // console.log(page);
}

function updateFaderBank(faders, page) {
    //compute Max i value
    // let bankFaderValue = []
    // let bankFaderName = []
    iMax = Math.ceil(faders.length/8) * 8;
    for (let i=0;i<iMax;i++) {
        if (i >= page*8 && i < ((page+1)*8)) {
            if (faders[i] !== undefined) {
                // console.log(name[i%8], faders[i]);
                XT.setFader(name[i%8], faders[i]);
                bankFaderValue.push(faders[i]);
                bankFaderName.push(fadersName[i]);
            } else {
                // console.log(name[i%8], 0);
                bankFaderName.push('');
                bankFaderValue.push('');
                XT.setFader(name[i%8], 0);
            }
        }
    }
    // console.log(bankFaderName);
    // console.log(bankFaderValue);
    XT.setFaderDisplay(bankFaderName,'top');
    XT.setFaderDisplay(bankFaderValue,'bottom');

}

let name = ['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7', 'CH8'];
let faders = [0,10,20,30,40,50,60,70,
          120,110,100,90,80,70,60,50,
          10];
let fadersName = ['1','2','3','4','5','6','7','8',
              '9','10','11','12','13','14','15','16',
              '17'];
let page = 0;
let bankFaderValue = [];
let bankFaderName = [];

XT.setFaderMode('CH1', 'position', 128);
XT.setFaderMode('CH2', 'position', 128);
XT.setFaderMode('CH3', 'position', 128);
XT.setFaderMode('CH4', 'position', 128);
XT.setFaderMode('CH5', 'position', 128);
XT.setFaderMode('CH6', 'position', 128);
XT.setFaderMode('CH7', 'position', 128);
XT.setFaderMode('CH8', 'position', 128);

// XT.setAutoButtonLights(true,'CH7.SELECT','CH7.MUTE','CH8.SELECT','CH8.MUTE');

//
// XT.sendRAW([240,0,0]);
// XT.sendRAW([102,20,18]);
// XT.sendRAW([0,102,97]);
// XT.sendRAW([100,101,114]);
// XT.sendRAW([56,32,247]);
// XT.sendMidi([1,2,3]);

// XT.setFaderDisplay('pouet',1);
// XT.setFaderDisplay([-32.4555555,0,0,0],'bottom');


// XT.setDisplay('full', 'aaabbccdd' ,false);
// XT.setDisplay('full', 'foo bar');
// XT.setButtonLight('CH7.SELECT', 'on');
// XT.setButtonLight('CH7.MUTE', 'off');

XT.start(function(msg) {
    console.log('Midi Init: ' + msg);
},{port:1});





updateFaderBank(faders,page);
