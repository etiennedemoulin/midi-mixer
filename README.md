# midi-mixer
This is the `no-max` branch.  
Map your midi controller  
Utility to map OSC send and receive with a MIDI controller. A JSON file is used to configure the object.  
Support for multiple pages, screens, fader touch and different fader mappings is integrated.  

## Installing
Clone the repo, `cd midi-mixer/midi-mixer/midi-mixer` then `npm install && npm run dev`.  

## JSON Syntax
- **channel** : [number] fader used on your midi device
  + 0 is master fader
  + channel > 8 can be accessed by pressing the "next page" button
- **name** : [string] name printed on device screen
- **type** : [string] - "linear" / "volume"
  + *linear* allows you to define range parameters
  + *volume* allows you direct volume mapping. linear2dB conversion is done by the mapping scrolling menu.
    * feel free to add mapping tables here `midi-mixer/midi-mixer/src/server/controllers/`
    * files contains : fader variable, array, each index is a midi value, value is the decibel that corresponds to the midi value. Meter variable (not implemented yet...)
- **range** : [array] [minimum value, maximum value]. Work only with linear type.
- **oscAddress** : [string] share param in OSC
- **default** : [number] default value on startup

## Global parameters
- Midi In : midi port to communicate with
- Midi Out : midi port to communicate with
- Mapping : linear / dB conversion for matching midi device
- OSC dest : OSC address to send 
- OSC send : OSC port to send
- OSC recv : OSC port to receive

## Midi support
The MIDI part of the software uses the Mackie-Control protocol, which is compatible with plenty of MIDI devices (BCF2000, XTouch, Asparion D400, Avid S1, etc.). 
Please set up your MIDI device in Mackie-Control mode before using the software.  

## Storing presets
There is a folder to retrieve presets in `midi-mixer/midi-mixer/midi-config` 
